import { NextResponse } from 'next/server';

const defaultInquireMessages = [
  {
    id: 'msg-1',
    sender: 'agent',
    text: 'Is weather the same as climate? What evidence in your notes supports your distinction?',
    messageType: 'chat',
    createdAt: new Date().toISOString(),
  },
];

export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    return NextResponse.json({
      success: true,
      messages: defaultInquireMessages,
      stageState: 'inquire',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch inquire stage state' }, { status: 500 });
  }
}
