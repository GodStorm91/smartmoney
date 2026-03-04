export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="hidden md:block bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-sm text-gray-500">
          <p>&copy; {currentYear} SmartMoney. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
