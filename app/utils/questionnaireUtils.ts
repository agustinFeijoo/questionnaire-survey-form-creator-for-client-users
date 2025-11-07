export function showPage(pageId: string) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
      page.classList.add('hidden');
    });
    const pageElement = document.getElementById(pageId);
    if (pageElement) {
      pageElement.classList.remove('hidden');
    }
  
    // Update page buttons styles
    document.querySelectorAll('#page-buttons span').forEach(span => {
      span.classList.remove('font-bold', 'text-custom-blue');
      if (span?.textContent?.trim() === pageId) {
        span.classList.add('font-bold', 'text-custom-blue');
      }
    });
  }
  
  export function showJson() {
    const form = document.getElementById('multiPageForm') as HTMLFormElement;
    const formData = new FormData(form);
    const json: { [key: string]: FormDataEntryValue } = {};
    formData.forEach((value, key) => {
      json[key] = value;
    });
    (document.getElementById('jsonOutput') as HTMLElement).innerText = JSON.stringify(json, null, 2);
  }
  