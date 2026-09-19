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
    expect(conversionResult.conceptNodeId).toBeDefined();

    const notes = await getNotesForModule(moduleId);
    const convertedNote = notes.find((n) => n.id === note.id);
    expect(convertedNote?.convertedToNode).toBe(true);
  });
});
