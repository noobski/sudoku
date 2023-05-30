/* eslint-disable no-console */
const running_local = window.location.origin === 'file://';
console.log(running_local ? 'running locally' : 'running on server');
const sudoku_server = running_local ? 'ws://localhost:3100' : 'http://poco.la:3100';

// *** Also need to:
// . upload /lib/game_lobby and /lib/user_db_client to server

/*   Communication protocol:

	 connect (send my username) ->
  -> 'players' (keep getting updated with players until you press start) ->
  -> 'start' (tell all players that game has started, and only then create the board
  -> 'board' (send mine to server upon changes)
*/
// eslint-disable-next-line no-unused-vars
class Comms {
	constructor(g){
		// connect to server
		// eslint-disable-next-line no-undef
		this.s = io.connect(sudoku_server);
		const s = this.s;
		s.on('connect_error', (err) =>
			console.log('connect_error due to '+err.message));
		s.on('connect', () => s.emit('username', g.username));
		s.on('waiting_players', (waiting_players, high_scores, games_played) => {
			g.players.add_players(waiting_players);
			g.players.show_high_scores(high_scores);
			g.board.show_games_played(games_played);
		});
		s.on('now_playing', (now_playing) => g.board.show_now_playing(now_playing));
		s.on('countdown_timer', (time) =>
			g.board.show_countdown(time));
		s.on('start', (board_array, board_show, board_level, players) =>
			g.start(board_array, board_show, board_level, players));
		s.on('board', (username, sq_left, strikes) =>
			g.players.update(username, sq_left, strikes));
		s.on('you_won', (reason) => g.game_over(true, reason));
		s.on('you_lost', (reason) => g.game_over(false, reason));
		s.on('new_high_score', (score, level) =>
			g.board.msg('New high score for level '+level+': '+score,'!'));
		s.on('msg', (msg) => console.log(msg));
		s.on('disconnect', (reason) => {
			console.log('disconnect received, reason=',reason);
			if(reason.split(' ').pop()!='disconnect')
				return;
			// server has forcefully disconnected because of duplicate username
			document.body.innerHTML='<br><br><h2 style="text-align: center; color: white">Another user is playing with same user name. <br><br>Refresh to play again</h2>';
		});
		s.on('dbg', (msg) => console.table(msg));
		s.on('nasty_message', (msg) => {
			console.log('nasty_message received: '+msg);
			g.board.msg(msg,'!');
		});
	}
	send_board(show, sq_left, strikes){
		this.s.emit('board', sq_left, strikes);
	}
	send_username(username){
		this.s.emit('username', username);
	}
	send_start(level){
		this.s.emit('start', level);
	}
	send_quit(){
		this.s.emit('quit');
	}
	send_lose(reason){
		this.s.emit('i_lost', reason);
	}
	send_win(reason){
		this.s.emit('i_won', reason);
	}
	send_lobby(){
		// tell server that this player is back in the 'waiting' pool
		this.s.emit('in_lobby');
	}
	ask_to_start_now(){
		this.s.emit('please_start_now');
	}
	send_desired_level(level){
		this.s.emit('desired_level', level);
	}
}
