export async function checkIfUserExists(email: string): Promise<userExists> {
    const response = await fetch('/api/check-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    
    return data;
  }

  export interface userExists{
    exists: boolean;
    hasSignedUp:boolean;
  }