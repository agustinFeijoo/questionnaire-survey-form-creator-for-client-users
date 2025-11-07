import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    const response = await fetch(
      "https://us-central1-onlinetaxman-c6d0f.cloudfunctions.net/user/userExists",
      {
        method: "POST",
        headers: {
          "x-api-key": process.env.XAPIKEY || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }
    );

    // Read the response body as JSON
    const responseBody = await response.json();

    // Log the response body for debugging
    //console.log(responseBody);

    // Return the response body as a JSON response
    return NextResponse.json(responseBody);

  } catch (error) {
    console.error('Error checking if user exists:', error);
    return NextResponse.json({ error: "Error checking if the user exists" }, { status: 500 });
  }
}
