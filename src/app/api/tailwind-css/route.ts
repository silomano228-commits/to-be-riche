import { NextResponse } from 'next/server';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const chunksDir = path.join(process.cwd(), '.next', 'dev', 'static', 'chunks');
    const files = readdirSync(chunksDir);
    const cssFile = files.find(f => f.startsWith('src_app_globals_css') && f.endsWith('.single.css'));

    if (!cssFile) {
      return new NextResponse('/* CSS not yet compiled */', {
        headers: { 'Content-Type': 'text/css', 'Cache-Control': 'no-cache' },
      });
    }

    const css = readFileSync(path.join(chunksDir, cssFile), 'utf-8');
    return new NextResponse(css, {
      headers: {
        'Content-Type': 'text/css',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch {
    return new NextResponse('/* Error loading CSS */', {
      headers: { 'Content-Type': 'text/css', 'Cache-Control': 'no-cache' },
    });
  }
}