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

class CameraStreamPanel extends React.Component {

    static defaultProps = {
        width: 320,
        height: 240,

        // dt: 30
        // dt: 100
        // dt: 500
        // dt: 200
        dt: 30,

        sumStep: 5,
        // scanSkip: 10
        // scanSkip: 30
        // scanSkip: 100,
        // scanSkip: 100,
        // scanSkip: 30,
        scanSkip: 100,
        // scanSkip: 3,

        chartUpdateSkip: 20,

        plotPointsNumber: 1000


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
        let {width, height} = this.props;
        let vendorURL = window.URL || window.webkitURL;

        this.frameNumber = 0;
        this.w = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;
        this.avrRedArr = [];

        // this.tracker = new tracking.ObjectTracker('face');
        // this.tracker = new tracking.Tracker('face');
        // this.tracker = new tracking.ObjectTracker(['face', 'eye', 'mouth']);let tt = +new Date();
        // this.tracker = new tracking.ObjectTracker(['eye', 'mouth']);

        this.tracker = new tracking.ObjectTracker(['face']);

        // this.tracker.setInitialScale(4);
        this.tracker.setInitialScale(1);
        // this.tracker.setStepSize(2);
        this.tracker.setStepSize(1);
        this.tracker.setEdgesDensity(0.1);


        this.tracker.on('track', (event) => {
            let ddt = +new Date() - (this.prevT == undefined ? 0 : this.prevT);
            this.prevT = +new Date();
            console.log('------------------');
            console.log('-----   ' + ddt + '-------');
            console.log('------------------');

            console.log('onTrack occured');
            console.log('event = ', event);
            console.log('event.data =  ', event.data);
            this.rectContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
            let max = -1;
            let resRect = undefined;
            event.data.forEach((rect) => {
                console.log('event data rect = ', rect);
                this.rectContext.strokeStyle = '#a64ceb';
                this.rectContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
                this.rectContext.font = '11px Helvetica';
                this.rectContext.fillStyle = "#fff";
                this.rectContext.fillText('x: ' + rect.x + 'px', rect.x + rect.width + 5, rect.y + 11);
                this.rectContext.fillText('y: ' + rect.y + 'px', rect.x + rect.width + 5, rect.y + 22);

                if (rect.width > max){
                    max = rect.width;
                    resRect = rect;
                }

            });

            if (resRect != undefined){
                this.x = resRect.x;
                this.y = resRect.y;
                this.w = resRect.width;
                this.h = resRect.height;
            }

        });
        // tracking.track('#video', this.tracker, { camera: true });

        // this.onVideoPlay();


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
        let {scanSkip, width, height, chartUpdateSkip} = this.props;
        this.context.drawImage(this.video, 0, 0, 320, 240);

        this.rectContext.clearRect(0, 0, width, height);
        this.faceContext.drawImage(this.canvas,
            +this.x + (0.2 * this.w), this.y, +this.w - (0.4 * this.w), this.h,
            0, 0, width, height)

        this.frameNumber++;
        // let arr = this.getRGBArray();
        // console.log('arr = ', arr);
        // console.log('this.frameNumber = ', this.frameNumber);
        let avrRed = this.getAvrRed();
        console.log('avrRed = ', avrRed);
        this.avrRedArr.push(avrRed);

        if (this.frameNumber % scanSkip == 0){
            console.log('trying to track');
            this.prevT = +new Date();
            tracking.track(this.canvas, this.tracker, { camera: true });
        }

        if (this.frameNumber % chartUpdateSkip == 0){
            this.forceUpdate();
        }

        setTimeout(() => {
            this.onVideoPlay();
        }, this.props.dt)
    }

    getRGBArray = () => {
        let context = this.faceContext;
        let {width, height} = this.props;
        let arr = [];
        let imData = context.getImageData(0, 0, width, height).data;
        for (let i = 0; i < imData.length / 4; i++){
            let from = i * 4;
            arr.push([imData[from], imData[from + 1], imData[from + 2]]);
        }
        return arr;
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
        let {plotPointsNumber} = this.props;
        let res = arr.slice(-plotPointsNumber);
        let min = 100000;
        res = res.filter(r => (r > 0))
        res =  res.map((c) => {
            if (c < min){
                min = c;
            }
            return {
                red: c
            }
        })
        console.log('min = ', min);
        res = res.map((r) => {return {red: (+r.red - +min) }})
        return res;
    }


    render = () => {
        let {error} = this.state;
        let {width, height} = this.props;

        let data = this.getPlotData();

        console.log('render: data = ', data);

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

                <div className={'canvas_placeholder'} >
                    <canvas
                        width={width} height={height}
                        style={{width: width, height: height}}
                        ref={(v) => {
                                    if (v == undefined){return;}
                                    this.canvasRect = v;
                                     this.rectContext = v.getContext('2d')
                                    }}></canvas>
                </div>

                <div className={'canvas_placeholder'} >
                    <canvas
                        width={width} height={height}
                        style={{width: width, height: height}}
                        ref={(v) => {
                                    if (v == undefined){return;}
                                    this.canvasFace = v;
                                    this.faceContext = v.getContext('2d')}
                        }></canvas>
                </div>

                {/*<div>*/}
                    {/*<button className={'ui button'} onClick={() => {this.recorder.startRecording()}} >*/}
                        {/*start recording*/}
                    {/*</button>*/}
                {/*</div>*/}

                <div className={'chart_placeholder'}>
                    <LineChart width={1000} height={300} data={data}
                               margin={{top: 0, right: 0, left: 0, bottom: 0}}>
                        <XAxis dataKey="name"/>
                        <YAxis/>
                        <Line
                            isAnimationActive={false}
                            dot={false}
                            type="monotone" dataKey="red" stroke="#8884d8" activeDot={{r: 0}} />
                    </LineChart>
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