import React, {useEffect, useState,} from 'react'
import { Button, Form, Grid, Header, Image, Message, Segment } from 'semantic-ui-react'
import { useAuth } from "../hooks/useAuth";
import { FirebaseApp, initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, UserCredential } from "firebase/auth";
import { STORE_KEY } from '../../constants/storeKey';
import { IPC_CMD } from '../../constants/ipcCmd';

export const Auth = () => {
  const { onLogin, token }: any = useAuth();
  const [isShowLogin, setIsShowLogin] = useState<Boolean>(true)
  const [defaultEmail, setDefaultEmail] = React.useState<string>("");

  useEffect(() => {
    window.Main.getStoreData(STORE_KEY.LATEST_USER_EMAIL)
    window.Main.on(IPC_CMD.GET_STORE_DATE, getStoreDataCallback);
    return() => {
      window.Main.off(IPC_CMD.GET_STORE_DATE, getStoreDataCallback);
    }
  }, [])

  const onClickToggle = () =>{
    console.log("onClickToggle")
    setIsShowLogin(!isShowLogin)
  }

  const getStoreDataCallback = async ({key, data}: any) => {
    if (key === STORE_KEY.LATEST_USER_EMAIL) {
      setDefaultEmail(data);
    }
  }

  if (isShowLogin === true) {
    return <SignIn defaultEmail={defaultEmail} onClickToggle={onClickToggle}/>;
  } else {
    return <Signup onClickToggle={onClickToggle}/>;
  }
};

export const SignIn = ({defaultEmail, onClickToggle}: any) => {
  const { onLogin }: any = useAuth();
  const [email, setEmail] = useState("");
  useEffect(() => {
    setEmail(defaultEmail);
    return () => {}
  }, [defaultEmail])

  const onChangeEmail = (evt: any) => {
    setEmail(evt.target.value);
  }

  const onSubmit = (evt: any) => {
    console.log(evt)
    onLogin(evt.target[0].value, evt.target[1].value);
  }
  return ( 
    <Grid textAlign='center' style={{ height: '100vh' }} verticalAlign='middle'>
    <Grid.Column style={{ maxWidth: 450 }}>
      <Header as='h2' color='teal' textAlign='center'>
        <Image src='/logo.png' /> Log-in to your account
      </Header>
      <Form size='large' onSubmit={onSubmit}>
        <Segment stacked>
          <Form.Input 
            fluid icon='user' 
            iconPosition='left' 
            placeholder='E-mail address'
            value={email}
            onChange={onChangeEmail}
          />
          <Form.Input
            fluid
            icon='lock'
            iconPosition='left'
            placeholder='Password'
            type='password'
          />

          <Button type='submit' color='teal' fluid size='large'>
            Login
          </Button>
        </Segment>
      </Form>
      <Message>
        New to us? <a href='#' onClick={onClickToggle}>Sign Up</a>
      </Message>
    </Grid.Column>
  </Grid>)
}


export const Signup = ({onClickToggle}: any) => {
  const { onSignup }: any = useAuth();
  const onSubmit = (evt: any) => {
    let email: string = evt?.target[0]?.value?.trim();
    let password: string = evt?.target[1]?.value?.trim();
    let passwordConfirm: string = evt?.target[2]?.value?.trim();
    if (!email || email.length === 0 
      || !password || password.length === 0
      || !passwordConfirm || passwordConfirm.length === 0
      || password !== passwordConfirm) {
        console.log("some value is empty. skip sign-up")
        return;
    }
    if (password !== passwordConfirm) {
        console.log("password is not same. please check the confirm password.")
        return;
    }
    onSignup(email, password);
  }
  return ( 
    <Grid textAlign='center' style={{ height: '100vh' }} verticalAlign='middle'>
    <Grid.Column style={{ maxWidth: 450 }}>
      <Header as='h2' color='teal' textAlign='center'>
        <Image src='/logo.png' /> Sign-up to your account
      </Header>
      <Form size='large' onSubmit={onSubmit}>
        <Segment stacked>
          <Form.Input fluid icon='user' iconPosition='left' placeholder='E-mail address' />
          <Form.Input
            fluid
            icon='lock'
            iconPosition='left'
            placeholder='Password'
            type='password'
          />
          <Form.Input
            fluid
            icon='lock'
            iconPosition='left'
            placeholder='Password confirm'
            type='password'
          />

          <Button type='submit' color='teal' fluid size='large'>
            Sign-up
          </Button>
        </Segment>
      </Form>
      <Message>
        <a href='#' onClick={onClickToggle}>Log In</a>
      </Message>
    </Grid.Column>
  </Grid>)
}