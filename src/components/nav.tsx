import {
  Container,
  Divider,
  Dropdown,
  Grid,
  Header,
  Icon,
  Image,
  List,
  Menu,
  Segment,
} from 'semantic-ui-react'

import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const fixedMenuStyle = {
  backgroundColor: '#fff',
  border: '1px solid #ddd',
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.2)',
}

export const Navigation = () => {
    const { token, onLogout }: any = useAuth();
    if (token) {
      return (
        <Menu
            borderless
            // fixed={'top'}
            style={fixedMenuStyle}
          >
            <Container text>
              <Menu.Item>
                <Image size='mini' src='/logo.png' />
              </Menu.Item>
              <Menu.Item header>Project Name</Menu.Item>
              <Menu.Item as={Link} to='/dashboard'>Dashboard</Menu.Item>
              <Menu.Item as={Link} to='/profile'>Profile</Menu.Item>

              <Menu.Menu position='right'>
                <Dropdown text='Link' pointing className='link item'>
                  <Dropdown.Menu>
                    <Dropdown.Item>코인판</Dropdown.Item>
                    <Dropdown.Item>김프가</Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Header>거래소</Dropdown.Header>
                    <Dropdown.Item>업비트</Dropdown.Item>
                      <Dropdown.Item>빗썸</Dropdown.Item>
                      <Dropdown.Item>바이낸스</Dropdown.Item>
                      <Dropdown.Item>바이빗</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Menu.Menu>
            </Container>
          </Menu>
      );
    } else {
      return (
        <></>
        )
    }
  };