$(function() {
    const Key = window.__SKYWAY_KEY__;
    const Mode = 'sfu';
    const peer = new Peer({
        key: window.__SKYWAY_KEY__,
        debug: 3,
    });

    let page = window.location.href.split('/').pop();
    if(page == "camera.html#") {
        page = "camera.html";
    }

    let localStream;
    let room;
    peer.on('open', () => {
        $('#my-id').text(peer.id);
        step1();
    });

    $('#make-call').on('submit', e => {
        e.preventDefault();
        const roomName = $('#join-room').val();
        if(!roomName) {
            return;
        }

        if(page == "camera.html") {
            room = peer.joinRoom('sfu_video_' + roomName, {mode: Mode, stream: localStream});
        } else {
            room = peer.joinRoom('sfu_video_' + roomName, {mode: Mode});
        }

        $('#room-id').text(roomName);
        step3(room);
    });

    $('#end-call').on('click', () => {
        room.close();
        step2();
    });

    $('#step1-retry').on('click', () => {
        $('#step1-error').hide();
        step1();
    });

    if(page == "camera.html") {
        const audioSelect = $('#audioSource');
        const videoSelect = $('#videoSource');
        const selectors = [audioSelect, videoSelect];

        navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
            const values = selectors.map(select => select.val() || '');
            selectors.forEach(select => {
                const children = select.children(':first');
                while (children.length) {
                    select.remove(children);
                }
            });

            for (let i=0; i!==deviceInfos.length; ++i) {
                const deviceInfo = deviceInfos[i];
                const option = $('<option>').val(deviceInfo.deviceId);

                if (deviceInfo.kind === 'audioinput') {
                    option.text(deviceInfo.label || 'Microphone ' + (audioSelect.children().length + 1));
                    audioSelect.append(option);
                } else if(deviceInfo.kind === 'videoinput') {
                    option.text(deviceInfo.label || 'Camera ' + (videoSelect.children().length + 1));
                    videoSelect.append(option);
                }
            }

            selectors.forEach((select, selectorIndex) => {
                if(Array.prototype.slice.call(select.children()).some(n => {
                    return n.value === values[selectorIndex];
                })) {
                    select.val(values[selectorIndex]);
                }
            });

            videoSelect.on('change', step1);
            audioSelect.on('change', step1);
        });
    }

    // camera.htmlのみ
    function step1() {
        if(page != "camera.html") {
            step2();
            return;
        }

        const audioSource = $('#audioSource').val();
        const videoSource = $('#videoSource').val();
        const constraints = {
            audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
            video: {deviceId: videoSource ? {exact: videoSource} : undefined},
        };

        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            $('#my-video').get(0).srcObject = stream;
            localStream = stream;

            if(room) {
                room.replaceStream(stream);
                return;
            }

            step2();
        }).catch(err => {
            $('#step1-error').show();
            console.error(err);
        });
    }

    function step2() {
        if(page == "camera.html") {
            $('#step1, #step3').hide();
        }else{
            $('#their-videos').empty();
            $('#step3').hide();
        }
        $('#step2').show();
        $('#join-room').focus();
    }

    function step3() {
        room.on('open', async(peerId) => {
            try {
                await dummyRoomJoin();
            } catch (err) {
                console.error(err);
            }
        });

        room.on('stream', stream => {
            if(page != "camera.html") {
                const peerId = stream.peerId;
                const id = 'video_' + peerId + '_' + stream.id.replace('{', '').replace('}', '');

                $('#their-videos').append($(
                    '<div class="video_' + peerId + '" id="' + id + '">' +
                    '<label>' + stream.peerId + ':' + stream.id + '</label>' +
                    '<video class="remoteVideos" autoplay playsinline>' +
                    '</div>'));
                const el = $('#' + id).find('video').get(0);
                el.srcObject = stream;
                el.play();
            }
        });

        room.on('close', step2);
        room.on('peerLeave', peerId => {
            console.log("peer(" + peerId + ") is leaved.");
            //$('.video_' + oeerId).remove();
        });

        if(page == "camera.html") {
            $('#step1').hide();
        }
        $('#step2').hide();
        $('#step3').show();
    }

    function dummyRoomJoin() {
        return new Promise((resolve, reject) => {
            const dummyPeer = new Peer({key: Key});
            dummyPeer.on('open', () => {
                const dummyRoom = dummyPeer.joinRoom('roomName', {mode: Mode});
                dummyRoom.on('open', () => {
                    dummyRoom.close();
                });
                dummyRoom.on('close', () => {
                    dummyPeer.destroy();
                    resolve();
                });
                dummyRoom.on('error', (err) => {
                    reject(err);
                });
            });
        });
    };
});
