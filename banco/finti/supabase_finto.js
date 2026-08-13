// Finge Supabase: il banco non deve autenticare, deve caricare modelli.
//
// Il costruttore di query dev'essere DUE cose insieme: concatenabile
// (.from().select().eq().order()) e attendibile con await, che risolve a
// { data: [], error: null }. La prima versione restituiva un Proxy anche
// all'await, il bundle riceveva un Proxy al posto dell'elenco progetti e
// moriva su "(projects || []).map is not a function" senza creare la scena.
const utente = { id: 'banco', email: 'banco@veritas.local' };

function query(dati) {
  const risultato = { data: dati === undefined ? [] : dati, error: null };
  const q = {
    then: (ris, rif) => Promise.resolve(risultato).then(ris, rif),
    catch: (f) => Promise.resolve(risultato).catch(f),
    finally: (f) => Promise.resolve(risultato).finally(f),
  };
  for (const m of ['select','insert','update','upsert','delete','eq','neq','in','is',
                   'order','limit','range','match','filter','contains','textSearch'])
    q[m] = () => query(dati);
  // .single() DEVE restituire una riga, non null: bootWithProject legge
  // subito .id e senza riga la scena non monta affatto.
  const progetto = {
    id: 'banco-1', name: 'banco di prova', project_type: 'aeroporto',
    user_id: utente.id, created_at: new Date().toISOString(), data: {},
  };
  q.single = () => query(progetto);
  q.maybeSingle = () => query(progetto);
  return q;
}

window.supabase = {
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: utente, access_token: 'banco' } }, error: null }),
      getUser: () => Promise.resolve({ data: { user: utente }, error: null }),
      onAuthStateChange: (cb) => { try { cb('SIGNED_IN', { user: utente }); } catch (e) {} 
        return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithPassword: () => Promise.resolve({ data: { user: utente, session: {} }, error: null }),
      signUp: () => Promise.resolve({ data: { user: utente }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => query([]),
    channel: () => ({ on: function () { return this; }, subscribe: function () { return this; } }),
    removeChannel: () => {},
    storage: { from: () => ({
      upload: () => Promise.resolve({ data: { path: '' }, error: null }),
      download: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }) },
  }),
};
console.log('[banco] supabase finto pronto');
