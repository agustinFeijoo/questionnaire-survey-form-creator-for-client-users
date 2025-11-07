"use server"
import crypto from 'crypto';
import { cookies } from 'next/headers';


const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'OTM55678901234567890123456789012';
const STATIC_IV = Buffer.from(process.env.STATIC_IV || '1237567890123666'); // 16 bytes IV

export async function decrypt(encryptedText: string) {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      console.error('Invalid encrypted text format');
      return '';
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}


export async function encrypt(text: string) {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), STATIC_IV);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return STATIC_IV.toString('hex') + ':' + encrypted.toString('hex');
}

export const retrieveCredentials = async (): Promise<{ emailCookie: string; passwordCookie: string } | null> => {
  const cook = await cookies();
  const email = cook.get("email")?.value;
  const encryptedPassword = cook.get("password")?.value || "";

  if (email && encryptedPassword) {
    const password = await decrypt(encryptedPassword);

    return {
      emailCookie: email,
      passwordCookie:password,
    };
  }

  return null;
};

export const setLoginCookies = async (email: string, password: string) => {
  try {
    const passwordHashed = await encrypt(password);
    const cookieStore = await cookies();
    
    cookieStore.set('email', email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'strict',
      path: '/',
    });

    cookieStore.set('password', passwordHashed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'strict',
      path: '/',
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to set login cookie:', error);
    return { error: 'Failed to sign in' };
  }
};


export async function deleteSessionCookies() {
  // Destroy the session
  let cook=await cookies();
  cook.set("email", "", { expires: new Date(0) });
  cook.set("password", "", { expires: new Date(0) });
}
