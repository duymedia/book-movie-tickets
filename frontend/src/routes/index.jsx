// src/routes/index.jsx
import { Navigate } from 'react-router-dom';
import Client from '../clients/layouts/Main';
import Home from '../clients/pages/Home';
import Order from '../clients/pages/Orders';
import Profile from '../clients/pages/Profile';
import ClientDashboard from '../clients/pages/Dashboard';
import Admin from '../admin/layouts/Main';
import Dashboard from '../admin/pages/dashboard/page';
import Members from '../admin/pages/members/page';
import Cinemas from '../admin/pages/cinemas/page';
import Rooms from '../admin/pages/rooms/page';
import Movies from '../admin/pages/movies/page';
import Seats from '../admin/pages/seats/page';
import Tickets from '../admin/pages/tickets/page';
import Payments from '../admin/pages/payments/page';
import Orders from '../admin/pages/orders/page';
import Combos from '../admin/pages/combos/page';
import { getAuthData } from '../utils/storage';

// Protect routes requiring authentication
const PrivateRoute = ({ element }) => {
  const { authToken } = getAuthData() || {};
  return authToken ? element : <Navigate to="/" />;
};

// Client routes (public and protected)
const clientRoutes = [
  { path: '/', element: <Home />, key: 'home' },
  { path: '/orders', element: <PrivateRoute element={<Order />} />, key: 'orders' },
  { path: '/profile', element: <PrivateRoute element={<Profile />} />, key: 'profile' },
  { path: '/dashboard', element: <PrivateRoute element={<ClientDashboard />} />, key: 'dashboard' },
];

// Admin routes (all protected)
const adminRoutes = [
  { path: '', element: <PrivateRoute element={<Dashboard />} />, key: 'dashboard' },
  { path: 'members', element: <PrivateRoute element={<Members />} />, key: 'members' },
  { path: 'cinemas', element: <PrivateRoute element={<Cinemas />} />, key: 'cinemas' },
  { path: 'rooms', element: <PrivateRoute element={<Rooms />} />, key: 'rooms' },
  { path: 'movies', element: <PrivateRoute element={<Movies />} />, key: 'movies' },
  { path: 'seats', element: <PrivateRoute element={<Seats />} />, key: 'seats' },
  { path: 'tickets', element: <PrivateRoute element={<Tickets />} />, key: 'tickets' },
  { path: 'payments', element: <PrivateRoute element={<Payments />} />, key: 'payments' },
  { path: 'orders', element: <PrivateRoute element={<Orders />} />, key: 'admin-orders' },
  { path: 'combos', element: <PrivateRoute element={<Combos />} />, key: 'combos' },
];

// Main route configuration
const routes = [
  {
    element: <Client />,
    children: clientRoutes,
  },
  {
    path: '/admin',
    element: <PrivateRoute element={<Admin />} />,
    children: adminRoutes,
  },
];

export default routes;