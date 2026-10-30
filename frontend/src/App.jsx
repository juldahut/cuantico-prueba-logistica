import { useState } from 'react';
import LoginForm from './features/auth/LoginForm.jsx';
import ChatPage from './features/chat/ChatPage.jsx';

// El token vive solo en memoria: al recargar la pagina hay que volver a
// entrar. Evita dejarlo en localStorage, donde lo leeria cualquier script.
export default function App() {
  const [session, setSession] = useState(null);

  if (!session) {
    return <LoginForm onLogin={setSession} />;
  }

  return <ChatPage token={session.token} user={session.user} onLogout={() => setSession(null)} />;
}
