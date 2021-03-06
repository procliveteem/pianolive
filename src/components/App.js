import React from 'react';
import io from 'socket.io-client';
import { Subscribe } from 'unstated';
import Soundfont from 'soundfont-player';

import './App.css';
import Piano from './Piano/Piano';
import { getRandomName, getRandomColor, hexToRgb } from '../tools/Random';
import KeysContainer, { keysContainer } from '../containers/Keys';
import RoomContainer, { roomContainer } from '../containers/Room';
import { getNoteForKey } from '../tools/Marker';
import { firework } from '../tools/Canvas';
import UsersContainer, { usersContainer } from '../containers/Users';

const nameDynamicStyle = color => ({
  textShadow: `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${color}, 0 0 30px ${color}`
});

export default class App extends React.Component {
  state = { player: null, socket: null };

  toggle = (note, state, emit, rgb) => {
    const color = rgb || roomContainer.state.rgb;
    if (note) {
      keysContainer.toggleNote(note, color, state);

      const socket = this.state.socket;
      if (emit && socket) {
        const data = {
          note,
          room: roomContainer.state.room,
          user: roomContainer.state.user,
          color: roomContainer.state.rgb
        };
        socket.emit(state ? 'noteOn' : 'noteOff', JSON.stringify(data));
      }

      const player = this.state.player;
      if (note.includes('s')) note = note[0] + '#';
      if (state && player) {
        this.state.firework(color);
        player.play(note.toUpperCase() + '4');
      }
    }
  };

  handleKeyUp = event => {
    let note = getNoteForKey(event.key);
    this.toggle(note, false, true);
  };

  handleKeyDown = event => {
    let note = getNoteForKey(event.key);
    this.toggle(note, true, true);
  };

  handleNameChange = event => {
    event.preventDefault();
    const socket = this.state.socket;
    if (socket) socket.emit('nameChange', roomContainer.state.user);
  };

  componentWillMount() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const room = window.location.pathname.substring(1);
    const color = getRandomColor();
    roomContainer.setState({
      room,
      color,
      rgb: hexToRgb(color),
      user: getRandomName()
    });
    Soundfont.instrument(new AC(), 'acoustic_grand_piano').then(piano => {
      this.setState(
        {
          player: piano,
          socket: io(
            process.env.NODE_ENV === 'production'
              ? '/'
              : 'http://localhost:4000/'
          )
        },
        () => {
          const socket = this.state.socket;
          if (socket) {
            socket.on('usersInRoom', data => {
              data = JSON.parse(data);
              usersContainer.setState({
                users: data.users.filter(
                  pianist => pianist.user !== roomContainer.state.user
                )
              });
            });
            socket.on('noteOn', data => {
              data = JSON.parse(data);
              this.toggle(data.note, true, false, data.color);
            });
            socket.on('noteOff', data => {
              data = JSON.parse(data);
              this.toggle(data.note, false, false, data.color);
            });
            socket.on('connect', () => {
              socket.emit(
                'room',
                JSON.stringify({
                  room: roomContainer.state.room,
                  user: roomContainer.state.user,
                  color: roomContainer.state.color
                })
              );
            });
          }
        }
      );
    });
  }

  componentDidMount() {
    this.setState({ firework: firework(this.canvas) });
  }

  render() {
    return (
      <div
        tabIndex={1}
        className="App"
        onKeyUp={this.handleKeyUp}
        onKeyDown={this.handleKeyDown}
      >
        <canvas className="Canvas" ref={el => (this.canvas = el)} />
        <Subscribe to={[KeysContainer, RoomContainer]}>
          {(keys, room) => (
            <Piano keys={keys} room={room} toggle={this.toggle} />
          )}
        </Subscribe>
        <Subscribe to={[RoomContainer]}>
          {room => (
            <form onSubmit={this.handleNameChange}>
              <input
                className="Name"
                value={room.state.user}
                style={nameDynamicStyle(room.state.color)}
                onChange={event =>
                  roomContainer.setState({ user: event.target.value })
                }
              />
              {room.state.room ? (
                <p className="Room">[{room.state.room}]</p>
              ) : null}
              <Subscribe to={[UsersContainer]}>
                {users => (
                  <div>
                    {users.state.users.map(pianist => (
                      <p
                        key={pianist.user}
                        style={{
                          fontSize: '40px',
                          textAlign: 'center',
                          color: pianist.color,
                          fontFamily: 'East Sea Dokdo'
                        }}
                      >
                        {pianist.user}
                      </p>
                    ))}
                  </div>
                )}
              </Subscribe>
            </form>
          )}
        </Subscribe>
      </div>
    );
  }
}
