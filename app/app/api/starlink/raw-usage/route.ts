import { NextResponse } from "next/server";
import { getElcomeToken } from "@/lib/elcomeToken";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const serviceLineNumber = searchParams.get("serviceLineNumber")?.trim();

  if (!serviceLineNumber) {
    return NextResponse.json({ error: "Missing serviceLineNumber" }, { status: 400 });
  }

  const token = await getElcomeToken();

  const res = await fetch("https://starlink-beta.elcome.com/api/public/v2/data-usage/query", {
    method: "POST",
    headers: {
      Authorization: `${token.tokenType} ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ serviceLineNumbers: [serviceLineNumber] }),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) return new NextResponse(text, { status: res.status });

  const json = JSON.parse(text);


  return NextResponse.json(json);
}
