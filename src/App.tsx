import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import WelcomeView from './views/WelcomeView'
import CharactersView from './views/CharactersView'
import ChatView from './views/ChatView'
import { useStore } from './store/StoreContext'

export default function App() {
  const { state } = useStore()
  const configured = !!state.settings.apiKey

  return (
    <Routes>
      <Route path="/welcome" element={<WelcomeView />} />
      <Route
        element={configured ? <Layout /> : <Navigate to="/welcome" replace />}
      >
        <Route path="/" element={<CharactersView />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/chat/:id" element={<ChatView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
