import "./navbar.css";
import { useNavigate } from "react-router-dom";

const Navbar=({ searchValue, onSearchChange, onSearchSubmit })=>{
    const navigate = useNavigate();
    const clientName = sessionStorage.getItem("loggedInUsername");
    const isAdmin = sessionStorage.getItem("loggedInRole")?.toLowerCase() === "admin";
    
    const handleSearchKeyDown = (event) => {
      if (event.key === "Enter") {
         event.preventDefault();
         onSearchSubmit?.();
      }
    }
    
    return(
        <div>
          <nav className="navbar">
            <div className="logo">
              E-Commerce-{clientName ? ` ${isAdmin ? "Admin: " : ""}${clientName}` : ""}
            </div>
            <ul>
                {onSearchChange && (
                  <input className="search"
                    type="search"
                    placeholder="Search Products..."  
                    value={searchValue}
                    onChange={(event) => onSearchChange(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                )}
                <li onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>Home</li>
                <li onClick={() => navigate("/details")} style={{ cursor: "pointer" }}>Orders</li>  
            <li 
               className="logout" 
                onClick={() => {
                sessionStorage.removeItem('loggedInUsername');
                sessionStorage.removeItem('accessToken');
                sessionStorage.removeItem('loggedInRole');
                localStorage.removeItem('shopCart');
                 navigate("/login");
            }} 
            style={{ cursor: "pointer" }}>LogOut</li>
        </ul>
          </nav>
        </div>
    );
}

export default Navbar;