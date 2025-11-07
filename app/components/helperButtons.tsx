import React, { useCallback, useMemo, useState } from "react";
import type { Firestore, DocumentData } from "firebase/firestore";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  setDoc,
  startAfter,
  orderBy,
} from "firebase/firestore";

export default function MigrationPanel({ db }: { db: Firestore }) {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const pushLog = useCallback((msg: string) => {
    setLog((l) => [
      `${new Date().toLocaleTimeString()} — ${msg}`,
      ...l,
    ]);
  }, []);

  const collections = useMemo(
    () => ({
      products: collection(db, "product"), // current name per prompt
      models: collection(db, "model"),
      boards: collection(db, "board"),
      metals: collection(db, "metal"),
    }),
    [db]
  );

  // ---------- Utilities ----------
  const getAllDocs = useCallback(
    async (colPath: keyof typeof collections) => {
      const colRef = collections[colPath];
      const docs: { id: string; data: DocumentData }[] = [];
      let snap = await getDocs(query(colRef, orderBy("__name__"), limit(500)));
      while (true) {
        snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));
        if (!snap.empty && snap.docs.length === 500) {
          const last = snap.docs[snap.docs.length - 1];
          snap = await getDocs(
            query(colRef, orderBy("__name__"), startAfter(last), limit(500))
          );
        } else {
          break;
        }
      }
      return docs;
    },
    [collections]
  );

  const toKey = (s?: string) => (s ?? "").trim();

  // ---------- Step A: Update MODELS (rename fields + swap id refs for names) ----------
  const updateModels = useCallback(async () => {
    pushLog("Building id→name maps for boards, metals, and products…");
    const [boards, metals, products] = await Promise.all([
      getAllDocs("boards"),
      getAllDocs("metals"),
      getAllDocs("products"),
    ]);

    const boardIdToName = new Map<string, string>();
    for (const b of boards) {
      const nm = (b.data?.name ?? b.data?.Name ?? b.id) as string;
      if (nm) boardIdToName.set(b.id, nm);
    }
    const metalIdToName = new Map<string, string>();
    for (const m of metals) {
      const nm = (m.data?.name ?? m.data?.Name ?? m.id) as string;
      if (nm) metalIdToName.set(m.id, nm);
    }
    const productIdToName = new Map<string, string>();
    for (const p of products) {
      const nm = (p.data?.name ?? p.data?.Name ?? p.id) as string;
      if (nm) productIdToName.set(p.id, nm);
    }

    pushLog("Updating model docs (formulas→metalFormulas, boards/metals names, idProduct→id)…");
    const modelDocs = await getAllDocs("models");

    // We’ll mutate each doc via transaction to avoid overwrites
    for (const { id, data } of modelDocs) {
      await runTransaction(db, async (trx) => {
        const ref = doc(db, "model", id);
        const current = data;
        const update: Record<string, any> = {};
        const deletes: string[] = [];

        // 1) formulas → metalFormulas
        if (Array.isArray(current.formulas) && !current.metalFormulas) {
          update.metalFormulas = current.formulas;
          deletes.push("formulas");
        }

        // 2) boards[].idBoard = board name
        if (Array.isArray(current.boards)) {
          const newBoards = current.boards.map((item: any) => {
            if (item && typeof item === "object" && toKey(item.idBoard)) {
              const byId = toKey(item.idBoard);
              const name = boardIdToName.get(byId);
              return name ? { ...item, idBoard: name } : item;
            }
            return item;
          });
          update.boards = newBoards;
        }

        // 3) metals[].idMetal = metal name
        if (Array.isArray(current.metals)) {
          const newMetals = current.metals.map((item: any) => {
            if (item && typeof item === "object" && toKey(item.idMetal)) {
              const byId = toKey(item.idMetal);
              const name = metalIdToName.get(byId);
              return name ? { ...item, idMetal: name } : item;
            }
            return item;
          });
          update.metals = newMetals;
        }

        // 4) idProduct → id (field rename only; keep original value)
        if (Object.prototype.hasOwnProperty.call(current, "idProduct")) {
          update.id = current.idProduct;
          deletes.push("idProduct");
        }

        // Apply updates
        if (Object.keys(update).length || deletes.length) {
          const merged = { ...current, ...update };
          for (const k of deletes) delete merged[k];
          trx.set(ref, merged, { merge: false });
        }
      });
      pushLog(`model/${id} updated`);
    }

    pushLog("Models updated.");
  }, [db, getAllDocs, pushLog]);

  // ---------- Generic: move docs so that docId becomes the value of a given field ----------
  async function moveDocsUsingFieldAsId(
    colName: keyof typeof collections,
    fieldName: string,
    options?: {
      alsoDeleteFields?: string[]; // fields to drop in the new doc
      alsoDeleteOldDoc?: boolean; // default true
      alsoDeleteFieldName?: boolean; // if true, remove fieldName in new doc
    }
  ) {
    const { alsoDeleteFields = [], alsoDeleteOldDoc = true, alsoDeleteFieldName = true } =
      options || {};
    const docs = await getAllDocs(colName);

    for (const { id: oldId, data } of docs) {
      const newId = toKey(data?.[fieldName]);
      if (!newId) {
        pushLog(`${colName}/${oldId} skipped (empty ${fieldName}).`);
        continue;
      }

      if (newId === oldId) {
        // still remove extra fields if requested
        const clean = { ...data };
        for (const f of alsoDeleteFields) delete clean[f];
        if (alsoDeleteFieldName) delete (clean as any)[fieldName];
        await setDoc(doc(db, String(colName), newId), clean, { merge: false });
        pushLog(`${colName}/${oldId} cleaned in place.`);
        continue;
      }

      // handle collisions
      const targetRef = doc(db, String(colName), newId);
      await runTransaction(db, async (trx) => {
        const clean = { ...data };
        for (const f of alsoDeleteFields) delete clean[f];
        if (alsoDeleteFieldName) delete (clean as any)[fieldName];
        trx.set(targetRef, clean, { merge: false });
      });

      if (alsoDeleteOldDoc) await deleteDoc(doc(db, String(colName), oldId));
      pushLog(`${colName}/${oldId} → ${newId}`);
    }
  }

  // ---------- Step B: Boards, Metals, Products doc-id migrations ----------
  const migrateBoards = useCallback(async () => {
    pushLog("Migrating boards: doc ID = name; remove name field…");
    await moveDocsUsingFieldAsId("boards", "name", {
      alsoDeleteFields: [],
      alsoDeleteOldDoc: true,
      alsoDeleteFieldName: true, // delete `name`
    });
    pushLog("Boards migrated.");
  }, [pushLog]);

  const migrateMetals = useCallback(async () => {
    pushLog("Migrating metals: doc ID = name; remove idMetal field…");
    // Keep `name` field (spec didn't ask to remove it), drop idMetal
    await moveDocsUsingFieldAsId("metals", "name", {
      alsoDeleteFields: ["idMetal"],
      alsoDeleteOldDoc: true,
      alsoDeleteFieldName: false,
    });
    pushLog("Metals migrated.");
  }, [pushLog]);

  const migrateProducts = useCallback(async () => {
    pushLog("Migrating products: doc ID = name; remove name & idProduct…");
    await moveDocsUsingFieldAsId("products", "name", {
      alsoDeleteFields: ["idProduct"],
      alsoDeleteOldDoc: true,
      alsoDeleteFieldName: true, // delete `name`
    });
    pushLog("Products migrated.");
  }, [pushLog]);

  // ---------- Step C: Delete all "initial" records ----------
  const deleteInitialRecords = useCallback(async () => {
    pushLog("Deleting all documents whose docId or name == 'initial' (case-insensitive)…");
    for (const key of ["products", "models", "boards", "metals"] as const) {
      const colRef = collections[key];
      const all = await getAllDocs(key);
      for (const { id, data } of all) {
        const isInitialId = toKey(id).toLowerCase() === "initial";
        const isInitialName = toKey(data?.name).toLowerCase() === "initial";
        if (isInitialId || isInitialName) {
          await deleteDoc(doc(colRef, id));
          pushLog(`${key}/${id} deleted (initial).`);
        }
      }
    }
    pushLog("Initial documents deleted.");
  }, [collections, getAllDocs, pushLog]);

  // ---------- Run all in safe order ----------
  const runAll = useCallback(async () => {
    if (running) return;
    setRunning(true);
    try {
      await updateModels();
      await migrateBoards();
      await migrateMetals();
      await migrateProducts();
      await deleteInitialRecords();
      pushLog("✅ Migration complete.");
    } catch (err: any) {
      console.error(err);
      pushLog(`❌ Error: ${err?.message || String(err)}`);
    } finally {
      setRunning(false);
    }
  }, [running, updateModels, migrateBoards, migrateMetals, migrateProducts, deleteInitialRecords, pushLog]);

  // ---------- UI ----------
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Firestore Migration Panel</h1>
      <p className="text-sm opacity-80">
        Order recommended: Update Models → Migrate Boards → Migrate Metals → Migrate Products → Delete Initials. Use “Run All” to execute in that order.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          className="px-4 py-2 rounded-2xl shadow disabled:opacity-50"
          onClick={updateModels}
          disabled={running}
        >
          Update Models
        </button>
        <button
          className="px-4 py-2 rounded-2xl shadow disabled:opacity-50"
          onClick={migrateBoards}
          disabled={running}
        >
          Migrate Boards (ID = name)
        </button>
        <button
          className="px-4 py-2 rounded-2xl shadow disabled:opacity-50"
          onClick={migrateMetals}
          disabled={running}
        >
          Migrate Metals (drop idMetal)
        </button>
        <button
          className="px-4 py-2 rounded-2xl shadow disabled:opacity-50"
          onClick={migrateProducts}
          disabled={running}
        >
          Migrate Products (ID = name)
        </button>
        <button
          className="px-4 py-2 rounded-2xl shadow disabled:opacity-50"
          onClick={deleteInitialRecords}
          disabled={running}
        >
          Delete "initial" docs
        </button>
        <button
          className="px-4 py-2 rounded-2xl shadow disabled:opacity-50"
          onClick={runAll}
          disabled={running}
        >
          ▶ Run All (safe order)
        </button>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Log</h2>
        <div className="mt-2 bg-black text-white rounded-xl p-3 h-64 overflow-auto text-xs whitespace-pre-wrap">
          {log.length === 0 ? (
            <div className="opacity-60">No output yet…</div>
          ) : (
            log.map((l, i) => <div key={i}>{l}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
