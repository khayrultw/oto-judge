import React, { createContext, useState, useContext } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    id: null,
    name: "",
    email: "",
    role: "",
  });

  const updateUser = (userData) => {
    setUser(userData);
  };

  const clearUser = () => {
    setUser({ id: null, name: "", email: "", role: "" });
  };

  return (
    <UserContext.Provider value={{ user, updateUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext); 