import { createNote, getNotesForModule, updateNote, deleteNote, convertNoteToNode } from '../src/domains/notes/noteService';

describe('Notes Domain Tests', () => {
  test('Creates note and persists to module session', async () => {
    const moduleId = 'test_mod_123';
    const note = await createNote({
      moduleId,
      sourceId: 'source-1',
      highlightedText: 'Global Warming right now!',
      noteText: 'The author confuses weather anomalies with climate trends.',
    });

    expect(note.id).toBeDefined();
    expect(note.convertedToNode).toBe(false);

    const notes = await getNotesForModule(moduleId);
    expect(notes.length).toBe(1);
    expect(notes[0].highlightedText).toBe('Global Warming right now!');
  });

  test('Edits existing note text successfully', async () => {
    const moduleId = 'test_mod_edit';
    const note = await createNote({
      moduleId,
      sourceId: 'source-1',
      highlightedText: 'tremendous amounts of snow',
      noteText: 'Initial note text',
    });

    const updated = await updateNote(note.id, 'Updated note explaining local vs regional weather');
    expect(updated?.noteText).toBe('Updated note explaining local vs regional weather');
  });

  test('Deletes note successfully', async () => {
    const moduleId = 'test_mod_del';
    const note = await createNote({
      moduleId,
      sourceId: 'source-1',
      highlightedText: 'staying in your house',
      noteText: 'Temporary note',
    });

    const isDeleted = await deleteNote(note.id);
    expect(isDeleted).toBe(true);

    const notes = await getNotesForModule(moduleId);
    const found = notes.find((n) => n.id === note.id);
    expect(found).toBeUndefined();
  });

  test('Converts note to concept node successfully', async () => {
    const moduleId = 'test_mod_456';
    const note = await createNote({
      moduleId,
      sourceId: 'source-1',
      highlightedText: 'Record cold snow',
      noteText: 'Weather anomaly',
    });

    const conversionResult = await convertNoteToNode(note.id);
    expect(conversionResult.success).toBe(true);
    expect(conversionResult.conceptNode).toBeDefined();
    expect(conversionResult.conceptNode?.id).toBeDefined();

    const notes = await getNotesForModule(moduleId);
    const convertedNote = notes.find((n) => n.id === note.id);
    expect(convertedNote?.convertedToNode).toBe(true);
  });

  test('Resiliently updates and persists note even when not preloaded in memory', async () => {
    const freshNoteId = `note_client_${Date.now()}`;
    const updated = await updateNote(freshNoteId, 'Resiliently saved note text', {
      moduleId: 'mod_resilient_test',
      sourceId: 'src-1',
      highlightedText: 'Evidence snippet',
    });

    expect(updated).toBeDefined();
    expect(updated.id).toBe(freshNoteId);
    expect(updated.noteText).toBe('Resiliently saved note text');

    const notes = await getNotesForModule('mod_resilient_test');
    expect(notes.some((n) => n.id === freshNoteId)).toBe(true);
  });
});
