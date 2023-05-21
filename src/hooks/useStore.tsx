import React from "react";
import { StoreContext } from "../App";

export const useStore = () => {
    return React.useContext(StoreContext);
};