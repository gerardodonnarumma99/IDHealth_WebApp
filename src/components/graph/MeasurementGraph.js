import { useEffect, useState } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(...registerables);

const options = {
    responsive: true,
    plugins: {
        legend: {
            position: 'top',
        }
    },
    scales: {
        xAxes: [{
            title: "time",
            type: 'time',
            gridLines: {
                lineWidth: 2
            }
        }]
    },
}

const MeasurementGraph = ({ axisData }) => {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
            <Line options={options} data={axisData} />
        </div>
    )
}

export default MeasurementGraph;