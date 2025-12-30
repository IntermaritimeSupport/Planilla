function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-[#0D0D21] text-white">

      
      {/* Barra inferior con copyright */}
      <div className="border-t border-white/10 bg-[#080814]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <p className="text-center text-sm text-gray-400 md:text-left">
              © {currentYear}.
            </p>
           
            <div className="mt-4 flex justify-center space-x-6 md:mt-0"> 
              <a href="/privacy" className="text-sm text-gray-400 transition-colors hover:text-orange-400">
                Política de Privacidad
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer