import React, { useContext, useEffect, useState } from "react";
import {Divider, Segment } from 'semantic-ui-react'
import MinDashboard from "../components/MinDashboard";
import MarketDetail from "../components/MarketDetail";

const Dashboard = () => {
    return (
        <Segment>
            <MinDashboard />
            <MarketDetail />
            <Divider />
        </Segment>
    );
};

export default Dashboard;