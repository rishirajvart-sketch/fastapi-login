
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Forms = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [loginname, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAge, setSignupAge] = useState('');
  const [signupGender, setSignupGender] = useState('');

  const showToast = (message, type) => setToast({ message, type });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      username: loginname,
      password: loginPassword
    };

    console.log("payload",payload)
    try {
      const response = await fetch("http://127.0.0.1:8000/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Login failed (${response.status})`);
      }

      const data = await response.json();
      console.log('Login Success:', data);
      localStorage.removeItem('shopCart');
      const username =
        (typeof data?.username === 'string' && data.username) ||
        (typeof data?.user?.username === 'string' && data.user.username) ||
        (typeof data?.user === 'string' && data.user) ||
        loginname;
      sessionStorage.setItem('loggedInUsername', username);
      if (typeof data?.access_token === 'string') {
        sessionStorage.setItem('accessToken', data.access_token);
      }
      if (typeof data?.role === 'string') {
        sessionStorage.setItem('loggedInRole', data.role);
      }

      navigate('/home', { state: { successMessage: 'Login successful!' } });

    } catch (error) {
      console.error('Error:', error);
      showToast('Login failed. Check your username and password, then try again.', 'error');
    }
  };


  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    if (signupPhone.length > 11) {
      showToast('Phone number cannot exceed 10 digits.', 'error');
      return;
    }
   const payload = {
      username: signupName,
      password: signupPassword,
      email: signupEmail,
      phone_number: signupPhone,     
      age: signupAge ? parseInt(signupAge, 10) : null,
      Gender: signupGender,    
      role: 'client'
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/signup", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMessage = "Signup failed. Please check your data.";
        try {
          const errorData = await response.json();
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
           
            errorMessage = errorData.detail
              .map((err) => `${err.loc[err.loc.length - 1]}: ${err.msg}`)
              .join('; ');
          }
        } catch {
          // Fallback if response isn't JSON
        }
        throw new Error(errorMessage);
      }

      setLoginName(signupName);
      setLoginPassword('');
      setIsLogin(true);
      showToast('Signup successful!', 'success');
    } catch (error) {
      console.error('Error:', error);
      showToast(
        error instanceof Error ? error.message : 'Signup failed. Please try again.',
        'error'
      );
    }
  };

  return (
    <main className="login-page">
      <div className="card">
        {/* Left Side: Custom Image Background Panel */}
        <div className="welcome-side">
          <div className="welcome-overlay">
            {/* <h2>Welcome Shopping</h2> */}
           
          </div>
        </div>

     
        <div className="form-side">
          {isLogin ? (
            <form className="login-form" onSubmit={handleLoginSubmit}>
              <h1>USER LOGIN</h1>
              <div className="login-field-row">
                <label className="login-field-label" htmlFor="login-username">Username</label>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter Your Username"
                  className="input" 
                  value={loginname}
                  onChange={(e) => setLoginName(e.target.value)}
                  required
                />
              </div>
              <div className="login-field-row">
                <label className="login-field-label" htmlFor="login-password">Password</label>
                <div className="password-input-wrapper">
                  <input 
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter Your Password" 
                    className="input" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)} 
                    required 
                  />
                  <button
                    className="password-visibility-toggle"
                    type="button"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showLoginPassword}
                    onClick={() => setShowLoginPassword((isVisible) => !isVisible)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {showLoginPassword ? (
                        <>
                          <path d="M3 3l18 18" />
                          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                          <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 9 5 9 7a10.7 10.7 0 0 1-3.1 4.2" />
                          <path d="M6.2 6.2C3.9 7.6 2 10.1 2 12c0 2 4 7 10 7a10.6 10.6 0 0 0 3-.4" />
                        </>
                      ) : (
                        <>
                          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <button type="submit">LOGIN</button>
              
              <p style={{ textAlign: 'center', marginTop: '15px' }}>
                Don't have account?{' '}
                <span onClick={() => setIsLogin(false)}>Signup</span>
              </p>
            </form>
          ) : (
            <form className="signup-form" onSubmit={handleSignupSubmit}>
              <h1>USER SIGNUP</h1>
              <div className="input-group">
                <div className="signup-field-row">
                  <label className="login-field-label" htmlFor="signup-username">Username</label>
                  <input
                    id="signup-username"
                    type="text"
                    placeholder="Enter Username"
                    className="input"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="signup-field-row">
                  <label className="login-field-label" htmlFor="signup-password">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      placeholder="Enter Your Password"
                      className="input"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                    <button
                      className="password-visibility-toggle"
                      type="button"
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showSignupPassword}
                      onClick={() => setShowSignupPassword((isVisible) => !isVisible)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        {showSignupPassword ? (
                          <>
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                            <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 9 5 9 7a10.7 10.7 0 0 1-3.1 4.2" />
                            <path d="M6.2 6.2C3.9 7.6 2 10.1 2 12c0 2 4 7 10 7a10.6 10.6 0 0 0 3-.4" />
                          </>
                        ) : (
                          <>
                            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="signup-field-row">
                  <label className="login-field-label" htmlFor="signup-email">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="xxxx@gmail.com"
                    className="input"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="signup-field-row">
                  <label className="login-field-label" htmlFor="signup-phone">Phone</label>
                  <input
                    id="signup-phone"
                    type="tel"
                    placeholder="Enter Your Phonenumber"
                    className="input"
                    value={signupPhone}
                    maxLength={10}
                    inputMode="numeric"
                    onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
                <div className="signup-field-row">
                  <label className="login-field-label" htmlFor="signup-age">Age</label>
                  <input
                    id="signup-age"
                    type="number"
                    placeholder="Enter Your Age"
                    className="input"
                    value={signupAge}
                    onChange={(e) => setSignupAge(e.target.value.slice(0, 2))}
                  />
                </div>
                <div className="signup-field-row">
                  <span className="login-field-label">Gender</span>
                  <fieldset className="gender-options" aria-label="Gender">
                    {['Male', 'Female','Others'].map((gender) => (
                      <label key={gender}>
                        <input
                          type="radio"
                          name="gender"
                          value={gender}
                          checked={signupGender === gender}
                          onChange={(e) => setSignupGender(e.target.value)}
                          required
                        />
                        {gender}
                      </label>
                    ))}
                  </fieldset>
                </div>
                <button className="signin-button" type="submit">SIGNUP</button>
                
                <p style={{ textAlign: 'center', marginTop: '15px' }}>
                  Already have an account?{' '}
                  <span onClick={() => setIsLogin(true)}>Login</span>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
      {toast && (
        <div className={`login-toast ${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
          {toast.message}
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}
    </main>
  );
};

export default Forms;
//     return(
        
//         <main className="signup-page">
//           <div className="signup-card">
//             <form onSubmit={handleSubmit}>
//               <h1>Signin</h1>
//               <div className="input">
//               <input 
//                 type="text" 
//                 placeholder="Username" 
//                 className="input" 
//                 value={name}
//                 onChange={(e) => setname(e.target.value)} 
//               />
//               <input 
//                 type="password" 
//                 placeholder="Password" 
//                 className="input" 
//                 value={password}
//                 onChange={(e) => setpassword(e.target.value)} 
//               />
//               <input 
//                 type="email" 
//                 placeholder="Email" 
//                 className="input" 
//                 value={email}
//                 onChange={(e) => setemail(e.target.value)} 
//               />
//               <input 
//                 type="tel" 
//                 placeholder="Phonenumber" 
//                 className="input" 
//                 value={phone}
//                 onChange={(e) => setphone(e.target.value)} 
//               />
//               <input 
//                 type="number" 
//                 placeholder="Age" 
//                 className="input" 
//                 value={age} 
//                 onChange={(e) => setage(e.target.value)} 
//               />
//               <button className="signin-button" type="submit">signin</button>
//                 {error && <p role="alert">{error}</p>}
//               </div>
//             </form>
//           </div>
//         </main> 
//     );
// }

// export default Login
// export default Forms
