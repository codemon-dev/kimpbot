import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { Form, Container, Button, Segment } from 'semantic-ui-react'
import APIKeyInfo from '../components/APIKeyInfo';

const Profile = () => {
    useEffect(() => {
        console.log("Mount Profile.");
        return () => {
            console.log("unMount Profile.");
        }
    }, []);
    return (
        <Container>
            <APIKeyInfo />
        </Container>
    );
};

export default Profile;