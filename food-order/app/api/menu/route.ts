import { NextResponse } from 'next/server'
import { menu } from '@/lib/menu'

export async function GET() {
  return NextResponse.json(menu)
}
