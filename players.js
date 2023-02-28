// manages users in lobby and in game from client's side

class Players{
	constructor(){
		// player is: {username: , sq_left, strikes}
		this.players = [];
	}
	add_players(waiting_players){
		this.players = [...waiting_players]; // copy
		game.user = this.players.find(p => p.username == game.username);
		this.show(); // redraw the board again
	}
	trim_for_game(players_to_keep){
		// remove all players that the server did not ask client to keep
		this.players = this.players.filter(p => 
			players_to_keep.includes(p.username));
	}
	show_high_scores(high_scores=null){
		game.players.high_scores = high_scores ? 
			high_scores : game.high_scores;
		game.board.show_high_scores(game.players.high_scores);
	}
	show(){
		game.state == 'playing' ? 
			this.show_rivals() : this.show_lobby();
	}
	show_lobby(){
		this.show_high_scores();
		// sort players list by:
		// - first this user
		// - .. then all users that are set to play his level
		// - .. the the *rest* sorted by playing levels
		let waiting_players = this.players.sort((p1, p2) => 
			(p1.desired_level<p2.desired_level)*(-1));
		waiting_players = waiting_players.sort((p1, p2) => 
			p1.desired_level==game.user.desired_level ? -1 : 0);
		waiting_players = waiting_players.sort((p1, p2) => 
			p1.username==game.user.username ? -1 : 0);
		game.board.show_waiting_players_in_lobby(waiting_players);
	}
	show_rivals(){
		// sort players list by order of 'squares left'
		let rivals = this.players.sort((p1, p2) => p1.sq_left - p2.sq_left);
		game.board.show_rivals_table(rivals);
	}
	update(username, sq_left, strikes, show){
		let player_to_update = this.players.find(e => 
			e.username == username);
		player_to_update.sq_left = sq_left;
		player_to_update.strikes = strikes;
		this.show();
	}
}
