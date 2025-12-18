import Home from './pages/Home';
import CommunityHub from './pages/CommunityHub';
import PublicCommunityHub from './pages/PublicCommunityHub';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import CompleteProfile from './pages/CompleteProfile';
import Profile from './pages/Profile';
import AuthCallback from './pages/AuthCallback';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import './App.css';
import FeastStudio from './pages/FeastStudio';
import MakeMyFeastDetails from './pages/MakeMyFeastDetails';
import FeastGuide from './pages/FeastGuide';
import RecipePage from './pages/RecipePage';
import NotFound from './pages/NotFound';
import AdminUsers from './pages/admin/Users';
import AdminRecipes from './pages/admin/Recipes';
import AdminCommunity from './pages/admin/Community';
import AdminLogin from './pages/admin/AdminLogin';
import AdminRoute from './components/admin/AdminRoute';
import SectionProtectedRoute from './components/admin/SectionProtectedRoute';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import NonAdminRoute from './components/NonAdminRoute';
import { useUserStoreRefresh } from './hooks/useUserStoreRefresh';

import About from './pages/About';
import Features from './pages/Features';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Support from './pages/Support';

// Component to redirect to first available admin section
function AdminDefaultRedirect() {
  const { assignedSections } = useAdminAuth();

  // Priority order: users, recipes, community
  const sectionOrder = ['users', 'recipes', 'community'];
  const firstAvailableSection = sectionOrder.find(section =>
    assignedSections.includes(section)
  );

  if (firstAvailableSection) {
    return <Navigate to={`/admin/${firstAvailableSection}`} replace />;
  }

  // If no sections available, show a message (shouldn't happen if admin check works)
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)',
      }}
    >
      <div className="text-center">
        <p className="text-lg text-neutral-61">No admin sections available. Please contact your administrator.</p>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();

  // Background refresh hook
  useUserStoreRefresh();

  // Define all valid routes
  const validRoutes = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/complete-profile',
    '/feast-studio',
    '/make-my-feast-details',
    '/community',
    '/explore-community',
    '/profile',
    '/auth-callback',
    '/about',
    '/features',
    '/contact',
    '/terms',
    '/privacy',
    '/support',
    '/admin',
    '/admin/login',
    '/admin/users',
    '/admin/recipes',
    '/admin/community'
  ];

  // Check if current path is a valid route
  const isValidRoute = validRoutes.includes(location.pathname) ||
    location.pathname.startsWith('/recipe/');

  // Routes that should not have Navbar and Footer
  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/admin/login'];
  const adminRoutes = ['/admin', '/admin/users', '/admin/recipes', '/admin/community'];
  const isRecipePage = location.pathname.startsWith('/recipe/') && !location.pathname.includes('/FeastGuide');
  const is404Page = !isValidRoute;
  const isAdminPage = adminRoutes.some(route => location.pathname.startsWith(route));

  // Show Navbar and Footer only if it's a valid route, not an auth route, admin route, and not a recipe page or 404
  const shouldShowNavAndFooter = isValidRoute && !authRoutes.includes(location.pathname) && !isAdminPage && !isRecipePage && !is404Page;

  return (
    <>
      {shouldShowNavAndFooter && <Navbar />}
      <Routes>
        <Route path='/' element={<NonAdminRoute><Home /></NonAdminRoute>} />
        <Route path='/login' element={<NonAdminRoute><Login /></NonAdminRoute>} />
        <Route path='/signup' element={<NonAdminRoute><SignUp /></NonAdminRoute>} />
        <Route path='/forgot-password' element={<NonAdminRoute><ForgotPassword /></NonAdminRoute>} />
        <Route path='/reset-password' element={<NonAdminRoute><ResetPassword /></NonAdminRoute>} />
        <Route path='/complete-profile' element={<NonAdminRoute><CompleteProfile /></NonAdminRoute>} />
        <Route path='/feast-studio' element={<NonAdminRoute><FeastStudio /></NonAdminRoute>} />
        <Route path='/make-my-feast-details' element={<NonAdminRoute><MakeMyFeastDetails /></NonAdminRoute>} />
        <Route path='/community' element={<NonAdminRoute><CommunityHub /></NonAdminRoute>} />
        <Route path='/explore-community' element={<NonAdminRoute><PublicCommunityHub /></NonAdminRoute>} />
        <Route path='/recipe/:id/FeastGuide' element={<NonAdminRoute><FeastGuide /></NonAdminRoute>} />
        <Route path='/recipe/:id' element={<NonAdminRoute><RecipePage /></NonAdminRoute>} />
        <Route path='/profile' element={<NonAdminRoute><Profile /></NonAdminRoute>} />
        <Route path='/auth-callback' element={<NonAdminRoute><AuthCallback /></NonAdminRoute>} />

        {/* Footer Pages */}
        <Route path='/about' element={<NonAdminRoute><About /></NonAdminRoute>} />
        <Route path='/features' element={<NonAdminRoute><Features /></NonAdminRoute>} />
        <Route path='/contact' element={<NonAdminRoute><Contact /></NonAdminRoute>} />
        <Route path='/terms' element={<NonAdminRoute><Terms /></NonAdminRoute>} />
        <Route path='/privacy' element={<NonAdminRoute><Privacy /></NonAdminRoute>} />
        <Route path='/support' element={<NonAdminRoute><Support /></NonAdminRoute>} />

        {/* Admin Routes */}
        <Route path='/admin/login' element={<AdminLogin />} />
        <Route
          path='/admin/*'
          element={
            <AdminAuthProvider>
              <AdminRoute>
                <Routes>
                  <Route path='' element={<AdminDefaultRedirect />} />
                  <Route path='users' element={
                    <SectionProtectedRoute requiredSection="users">
                      <AdminUsers />
                    </SectionProtectedRoute>
                  } />
                  <Route path='recipes' element={
                    <SectionProtectedRoute requiredSection="recipes">
                      <AdminRecipes />
                    </SectionProtectedRoute>
                  } />
                  <Route path='community' element={
                    <SectionProtectedRoute requiredSection="community">
                      <AdminCommunity />
                    </SectionProtectedRoute>
                  } />
                </Routes>
              </AdminRoute>
            </AdminAuthProvider>
          }
        />

        {/* Catch-all route for 404 - must be last */}
        <Route path='*' element={<NotFound />} />
      </Routes>
      {shouldShowNavAndFooter && <Footer />}
    </>
  )
}

function App() {
  return <AppContent />
}

export default App