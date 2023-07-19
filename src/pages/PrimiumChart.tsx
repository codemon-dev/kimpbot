import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { Form, Container, Button, Segment, Divider, Card } from 'semantic-ui-react'
import PrimiumChartInfo from '../components/PrimiumChartInfo';
import { useStore } from '../hooks/useStore';

const PrimiumChart = () => {
    const { primiumChartInfo }: any = useStore();
    
    useEffect(() => {
        console.log("Mount PrimiumChart.");
        return () => {
            console.log("unMount PrimiumChart.");
        }
    }, [primiumChartInfo]);
    return (
        <Container>
            <Card fluid>
                <p>진입 김프 차트</p>
                <PrimiumChartInfo data={primiumChartInfo?.enter} id={"enter"}/>            
            </Card>
            <Divider />
            <Card fluid>
                <p>탈출 김프 차트</p>
                <PrimiumChartInfo data={primiumChartInfo?.exit} id={"exit"}/>    
            </Card>
        </Container>
    );
};

export default PrimiumChart;