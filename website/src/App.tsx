import './App.css'
import { RedisProvider } from '@/context/RedisContext'
import ConfigForm from '@/components/ConfigForm'
import SearchAlerts from '@/components/SearchAlerts'
import SearchTable from '@/components/SearchTable'

function App() {
  return (
    <RedisProvider>
      <div className="container mx-auto py-8 px-4">
        <header className="space-y-2 text-center mb-8">
          <h1 className="text-3xl font-bold">Property Alerts Manager</h1>
          <p className="text-muted-foreground">Manage your property search alerts</p>
        </header>
        
        <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-card p-6 rounded-lg shadow">
            <ConfigForm />
          </section>
          
          <section className="bg-card p-6 rounded-lg shadow">
            <SearchAlerts />
          </section>
          
          <section className="bg-card p-6 rounded-lg shadow md:col-span-2">
            <SearchTable />
          </section>
        </main>
        
        <footer className="mt-10 pt-4 border-t text-center text-muted-foreground">
          <p>Property Alerts Manager &copy; {new Date().getFullYear()}</p>
          <p className="mt-2">
            <a 
              href="https://github.com/yourusername/property_alerts" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub Repository
            </a>
          </p>
        </footer>
      </div>
    </RedisProvider>
  )
}

export default App
