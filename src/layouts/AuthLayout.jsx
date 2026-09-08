import Brand from '../components/Brand'

export default function AuthLayout({ children, variant = 'default' }) {
  return (
    <main className={`auth-shell auth-shell--${variant}`}>
      <section className="auth-visual" aria-label="Condomínio moderno">
        <div className="auth-visual__copy">
          <h1>Gestão condominial<br />simples e conectada.</h1>
          <p>Moradores · Portaria · Administração</p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <Brand />
          {children}
          <footer>
            <span>Acesso exclusivo para usuários cadastrados no condomínio.</span>
            <span>Condo+ © 2026</span>
          </footer>
        </div>
      </section>
    </main>
  )
}
