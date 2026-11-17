import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Cinemas from "./admin/pages/cinemas/page";
import Rooms from "./admin/pages/rooms/page";
import Movies from "./admin/pages/movies/page";
import Seats from "./admin/pages/seats/page";
import Tickets from "./admin/pages/tickets/page";
import Payments from "./admin/pages/payments/page";
import Orders from "./admin/pages/orders/page";
import Combos from "./admin/pages/combos/page";
import Dashboard from "./admin/pages/dashboard/page";
import Members from "./admin/pages/members/page";
import Admin from "./admin/layouts/Main";
import Client from "./clients/layouts/Main";
import Home from "./clients/pages/Home";
import Order from "./clients/pages/Orders";
import Profile from "./clients/pages/Profile";

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Client />}>
          <Route path="/" element={<Home />} />
          <Route path="/orders" element={<Order />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="/admin" element={<Admin />}>
          <Route index element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="cinemas" element={<Cinemas />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="movies" element={<Movies />} />
          <Route path="seats" element={<Seats />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="payments" element={<Payments />} />
          <Route path="orders" element={<Orders />} />
          <Route path="combos" element={<Combos />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;