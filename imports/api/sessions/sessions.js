import { Mongo } from 'meteor/mongo';

export const Sessions = new Mongo.Collection('sessions');

Sessions.notePreview = function(session) {
  if (!session || !session.note) {
    return;
  }
  const limit = 128;
  const substring = session.note.replace(/<br> *<br>/g, '<br>').substring(0, limit);
  return substring + (session.note.length > limit ? '…' : '');
}
