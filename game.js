/* global Board Players Comms */
// eslint-disable-next-line no-unused-vars
class Game {
	constructor(){
		// user name
		this.username = this.get_username();
		this.user = null;
		// setup comms
		this.comms = new Comms(this);
		// setup players board
		this.players = new Players();
		this.board = new Board(this);
		// set initial game state
		this.set_state('waiting');
	}
	game_over(win, txt=''){
		this.set_state('game_over');
		this.board.game_over(win, txt);
	}
	game_button_pressed(){
		// 'quit' pressed
		if(this.state=='playing')
			this.comms.send_quit();
		// 'back to lobby' pressed (at end of game)
		else if(this.state=='game_over')
		{
			this.set_state('waiting');
			this.comms.send_lobby();
		}
	}
	set_state(new_state){
		// 'connected' -> 'waiting' -> 'playing' -> 'game_over'
		this.state = new_state;
		// toggle page lobby/game-mode in HTML
		document.body.className = new_state=='waiting' ? '' : 'game_bg_img';
		document.getElementById('lobby').style.display =
			new_state=='waiting' ? 'flex' : 'none';
		document.getElementById('game').style.display =
			new_state=='waiting' ? 'none' : 'flex';
	}
	start(board_array, board_show, level, players_in_the_game){
		this.level = level;
		this.set_state('playing');
		// erase messages
		this.board.msg('');
		// reset lobby buttons
		this.board.lobby_buttons_remove_highlight();
		// create the board and start the timer & game
		this.board.build_new_board(board_array, board_show);
		this.players.trim_for_game(players_in_the_game);
		this.players.show();
	}
	get_username(change){
		// get username from localstorage if exists
		let user = localStorage.username;
		if(user && user !='null' && !change)
			return user;
		// prompt user for username
		const new_user = window.prompt('How do you want to be known?');
		// pressing 'enter' keeps the old user name (if exists)
		if(new_user == 'null' && user && user != 'null')
			return user;
		user = new_user;
		// don't allow null input
		if(!user || user=='null')
			return this.get_username();
		// store new username and transmit to server
		localStorage.username = user;
		if(change)
			this.comms.send_username(user);
		return user;
	}
}
