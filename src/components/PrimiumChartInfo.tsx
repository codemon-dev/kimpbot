import _ from 'lodash';

import React, { useEffect, useState, useRef } from 'react';
import { Form, Container, Button, Divider } from 'semantic-ui-react'
import { createChart, ColorType, IChartApi, CandlestickData, TickMarkType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { convertChartLable, convertChartMarker, convertLocalTime } from '../../util/timestamp';
import { OCHL } from '../../interface/ITradeInfo';

export interface ChartInfoProps {
    data: OCHL[],
    id: string
}

const PrimiumChartInfo = (props: ChartInfoProps) => {

    let interval: any = null;

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chart = useRef<any>(null);
    const primiumChart = useRef<any>(null);

    let chartCofig: any = {
		colors: {
			backgroundColor: 'white',
			lineColor: '#2962FF',
			textColor: 'black',
			areaTopColor: '#2962FF',
			areaBottomColor: 'rgba(41, 98, 255, 0.28)',
		}
	}

    useEffect(() => {
        if (!chartContainerRef?.current) {
            return;
        }
        const toolTipWidth = 165;
        const toolTipHeight = 100;
        const toolTipMargin = 15;
        const toolTip = document.createElement('div');
        chartContainerRef.current?.appendChild(toolTip);
        
        // Create and style the tooltip html element
        toolTip.style.width = `${toolTipWidth}px`;
        toolTip.style.height = `${toolTipHeight}px`;
        toolTip.style.position = `absolute`;
        toolTip.style.display = `none`;
        toolTip.style.padding = `8px`;
        toolTip.style.boxSizing = `border-box`;
        toolTip.style.fontSize = `12px`;
        toolTip.style.textAlign = `left`;
        toolTip.style.zIndex = `1000`;
        
        toolTip.style.top = `12px`;
        toolTip.style.left = `12px`;
        toolTip.style.pointerEvents = `none`;
        toolTip.style.borderRadius = `4px 4px 0px 0px`;
        toolTip.style.borderBottom = `none`;
        toolTip.style.boxShadow = `0 2px 5px 0 rgba(117, 134, 150, 0.45)`;
        toolTip.style.fontFamily = `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`;
        toolTip.style.background = `rgba(${'255, 255, 255'}, 0.25)`;
        toolTip.style.color = 'black';
        toolTip.style.borderColor = 'rgba( 239, 83, 80, 1)';    

        const handleResize = () => {
            chart.current.applyOptions({ width: chartContainerRef?.current?.clientWidth ?? 0 });
        };

        chart.current = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: chartCofig.backgroundColor },
                textColor: chartCofig.colors.textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            localization: {
                timeFormatter: (time: number) => {
                    return convertChartMarker(time * 1000)
                }
            },
            timeScale: {
                tickMarkFormatter: (time: number, tickMarkType: TickMarkType, locale: string) => {
                    return convertChartLable(time * 1000)
                },
                fixLeftEdge: true,
                rightOffset: 20,
            },
            crosshair: {
                mode: CrosshairMode.Normal,
	            vertLine: {
                    visible: true,
                },
	            horzLine: {
                    visible: true,
                },
            }
        });

        chart.current.subscribeCrosshairMove((param: any) => {
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > (chartContainerRef.current?.clientWidth ?? 0) ||
                param.point.y < 0 ||
                param.point.y > (chartContainerRef.current?.clientHeight ?? 0)
            ) {
                toolTip.style.display = 'none';
            } else {
                // time will be in the same format that we supplied to setData.
                // thus it will be YYYY-MM-DD
                const dateStr = convertLocalTime(param.time * 1000);
                toolTip.style.display = 'block';
                const data = param.seriesData.get(primiumChart?.current);
                toolTip.innerHTML = 
                    `<div style="font-size: 24px; color: ${'rgba( 239, 83, 80, 1)'}">
                        ${data?.close?.toFixed(3)}%
                    </div>
                    <div style="height: 10px">
                    <div style="color: ${'black'}">
                        open: ${data?.open?.toFixed(3)}% close: ${data?.close?.toFixed(3)}%
                    </div>
                    <div style="color: ${'black'}">
                        high: ${data?.high?.toFixed(3)}% low: ${data?.low?.toFixed(3)}%
                    <div style="color: ${'black'}">
                        ${dateStr}
                    </div>`;
                console.log("x: ", param.point.x)                

                const y = param.point.y;
                let left = param.point.x + toolTipMargin;
                if (left > (chartContainerRef.current?.clientWidth ?? 0) - toolTipWidth) {
                    left = param.point.x - toolTipMargin - toolTipWidth;
                }


                let top = y + toolTipMargin;
                if (top > (chartContainerRef.current?.clientWidth ?? 0) - toolTipHeight) {
                    top = y - toolTipHeight - toolTipMargin;
                }
                toolTip.style.left = left + 'px';
                toolTip.style.top = top + 'px';
                
            }
        });

        chart.current.timeScale().fitContent();

        primiumChart.current = chart.current.addCandlestickSeries(
            { upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350' }
        );

        if (props.data) {
            primiumChart?.current.setData(props.data);
            primiumChart?.current.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.3, // leave some space for the legend
                    bottom: 0.25,
                },
            })
        }

        window.addEventListener('resize', handleResize);

        if (interval) {
            clearInterval(interval);
            interval = null;
        }
        interval = setInterval(() => {
            window.Main.requestPrimiumChartData();
        }, 5000);
        
        return () => {
            console.log("unMount PrimiumChartInfo.");
            window.removeEventListener('resize', handleResize);
            chart.current.remove();
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        }
    }, []);

    useEffect(
		() => {
            console.log(props.data);
            // console.log("enterPrimiumChart:", enterPrimiumChart.current);
            // console.log("exitPrimiumChart:", exitPrimiumChart.current);
            
            if (props.data) {
                primiumChart.current?.setData(props.data);
            }
		},
		[props.data]
	);

	return (
        <div ref={chartContainerRef} id={props.id} />
	);
};

export default PrimiumChartInfo;