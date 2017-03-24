/**
 * Created by sabir on 23.03.17.
 */

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend} from 'recharts';

import RecordRTC from 'recordrtc'

// import tracking from 'tracking'

// import face_detect from 'face-detect'

import moment from 'moment'

class CameraStreamPanel extends React.Component {

    static defaultProps = {
        // width: 160,
        // height: 120,
        width: 200,
        height: 200,


        dt: 33,

        sumStep: 5,

        scanSkip: 100,

        // chartUpdateSkip: 30,
        chartUpdateSkip: 9,

        // plotPointsNumber: 1000
        plotPointsNumber: 200,

        changeBazisInterval: 150,

        // plotPointsNumber: 120

    }

    static propTypes = {}

    state = {
        error: undefined
    }

    //ES5 - componentWillMount
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.init();
    }

    componentWillReceiveProps() {

    }

    init = () => {
        Core.initGPU();

        let {width, height} = this.props;
        let vendorURL = window.URL || window.webkitURL;

        this.frameNumber = 0;
        this.w = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;
        this.avrRedArr = [];
        this.anglesArr = [];
        this.timesArray = [];


        navigator.getUserMedia({video:true}, (stream) => {
            // this.stream = stream;
            this.video.src = vendorURL.createObjectURL(stream);

            this.video.addEventListener('play', this.onVideoPlay, false)
            this.video.play();
            // tracking.track(this.canvas, this.tracker, { camera: true });
        }, (err) => {
            this.setState({
                error: err
            });
        });
    }

    componentWillUnmount() {
        this.video.removeEventListener('play');
    }


    onVideoPlay = (a, b, c, d, e) => {
        let t0 = + new Date();
        let {scanSkip, width, height, chartUpdateSkip, changeBazisInterval} = this.props;
        this.context.drawImage(this.video, 0, 0, width, height);
        // this.context.drawImage(this.video, 0.2 * width, 0.2*height, width * 0.6, height * 0.6, 0, 0, width, height
        //                             );

        let avrRed = this.getAvrRed();
        console.log('avrRed = ', avrRed);
        this.avrRedArr.push(avrRed);
        this.timesArray.push(+new Date());

        let magicMatrix = this.getJuiceArr();
        let angles = [];

        let jT0 = + new Date();
        if (avrRed > 0){
            if (Core.needToRefreshBazis() || (this.frameNumber % changeBazisInterval == 0)){
                Core.saveBazis(magicMatrix);
            }else {
                angles = Core.calculateAngles(magicMatrix);
                console.log('angles = ', angles);
            }
        }

        let jT = +new Date() - jT0;
        console.log('Juice time = ', jT);

        console.log('angles = ', angles);
        if (angles.length > 0){
            this.anglesArr.push(angles);
        }

        this.frameNumber++;


        if (this.frameNumber % scanSkip == 0){
            console.log('trying to track');
            this.prevT = +new Date();
        }

        let t1 = + new Date();
        let timeElapsed = t1 - t0;
        console.log('timeElapsed = ', timeElapsed);

        if (this.frameNumber % chartUpdateSkip == 0){
            this.forceUpdate();
        }

        setTimeout(() => {
            this.onVideoPlay();
        }, this.props.dt)
    }

    getRGBArray = () => {
        // let context = this.faceContext;
        let context = this.context;
        let {width, height} = this.props;
        let arr = [];
        let imData = context.getImageData(0, 0, width, height).data;
        for (let i = 0; i < imData.length / 4; i++){
            let from = i * 4;
            arr.push([imData[from], imData[from + 1], imData[from + 2]]);
        }
        return arr;
    }

    getJuiceArr = () => {
        let arr = this.getRGBArray();
        let res = [];
        res.push(arr.map(a => a[0]));
        res.push(arr.map(a => a[1]));
        res.push(arr.map(a => a[2]));
        return res;
    }


    getAvrRed = () => {
        let arr = this.getRGBArray();
        let sum = 0;
        for (let i in arr){
            sum = sum + arr[i][0];
        }
        let avr = (1.0 * sum / arr.length);
        return avr;
    }

    getPlotData = () => {
        let arr = this.avrRedArr == undefined ? [] : this.avrRedArr;
        let timeArr = this.timesArray == undefined ? [] : this.timesArray;
        let {plotPointsNumber} = this.props;
        let res = arr.slice(-plotPointsNumber);
        timeArr = timeArr.slice(-plotPointsNumber);
        let min = 100000;
        res = res.filter(r => (r > 0))
        res =  res.map((c, k) => {
            if (c < min){
                min = c;
            }
            return {
                red: c,
                time: timeArr[k],
                timeS: moment(timeArr[k]).format('s')
            }
        })
        console.log('min = ', min);
        // res = res.map((r) => {return {red: (+r.red - +min) }})
        res = res.map((r) => {return {red: (+r.red - 200), timeS: r.timeS }})
        return res;
    }

    getAnglesPlotData = () => {
        let arr = this.anglesArr == undefined ? [] : this.anglesArr;
        let timeArr = this.timesArray == undefined ? [] : this.timesArray;
        let {plotPointsNumber} = this.props;
        let res = arr.slice(-plotPointsNumber);
        timeArr = timeArr.slice(-plotPointsNumber);
        let {dt} = this.props;
        let now = +new Date();
        return res.map((r, k) => {
            let t = now - (res.length - k) * dt;
            return {
                a: r[0],
                b: r[1],
                t: t,
                momT: moment(t).format('s'),
                time: timeArr[k],
                timeS: moment(timeArr[k]).format('s')
            }
        })
    }


    render = () => {
        let {error} = this.state;
        let {width, height} = this.props;

        let data = this.getPlotData();
        let aData = this.getAnglesPlotData();



        // console.log('render: aData = ', aData);

        return (
            <div className={'camera_stream_panel'} >


                {error == undefined ? null :
                    <div className={'ui red message'}  >
                        {JSON.stringify(error)}
                    </div>
                }

                <div className={'video_placeholder'} style={{width: width, height: height}} >
                    <video ref={(v) => {this.video = v;}}
                           id="video"
                           width={width} height={height}
                           style={{width: width, height: height}}
                    >

                    </video>
                </div>

                <div className={'canvas_placeholder'} >
                    <canvas
                        width={width} height={height}
                        style={{width: width, height: height}}
                        ref={(v) => {
                            if (v == undefined){return;}
                            this.canvas = v;
                            this.context = v.getContext('2d')
                        }}></canvas>
                </div>


                <div className={'chart_placeholder'}>
                    <LineChart width={1000} height={300} data={aData}
                               margin={{top: 0, right: 0, left: 0, bottom: 0}}>

                        <YAxis/>
                        <Line
                            isAnimationActive={false}
                            dot={false}
                            type="monotone" dataKey="a" stroke="#8884d8" />
                        />

                        <Line
                            isAnimationActive={false}
                            dot={false}
                            type="monotone" dataKey="b" stroke="pink" />
                        />

                        <XAxis dataKey="timeS" />


                    </LineChart>
                </div>

                <div className={'chart_placeholder'}>
                    <LineChart width={1000} height={300} data={data}
                               margin={{top: 0, right: 0, left: 0, bottom: 0}}>
                        <XAxis dataKey="timeS"/>
                        <YAxis/>
                        <Line
                            isAnimationActive={false}
                            dot={false}
                            type="monotone" dataKey="red" stroke="#8884d8" activeDot={{r: 0}} />
                    </LineChart>
                </div>

                <div>
                    {this.frameNumber}
                </div>

            </div>
        )
    }

}


//const mapStateToProps = (state) => {
//    return {
//        currentUserId: state.users.currentUserId,
//        loading: state.users.loading
//    }
//}

//const mapDispatchToProps = (dispatch) => {
//    return {
//        onLogout: (data) => {
//            dispatch(actions.logOut())
//        }
//    }
//}

//CameraStreamPanel = connect(mapStateToProps, mapDispatchToProps)(CameraStreamPanel)

export default CameraStreamPanel