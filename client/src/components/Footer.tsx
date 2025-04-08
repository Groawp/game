export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Badminton Sign Up. All rights reserved. <br />
          <span className="text-xs text-gray-400 mt-1">Designed by Duy Le</span>
        </p>
      </div>
    </footer>
  );
}
