/* eslint-disable no-unused-vars */
/* eslint-disable no-magic-numbers */
/* global running_local Chat */
class Board{
	constructor(game){
		this.game = game;
		// check if running on mobile device that requires resizing of board
		this.using_mobile =  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		// accomodate mobile
		this.cell_w = this.using_mobile ? (window.innerWidth-30)/9 : 49; //grid cells
		this.t_cell_h = this.cell_w*0.7; // table row height
		const fs = this.font_size = this.cell_w*0.4; // default font size
		[...document.getElementsByClassName('msg')].forEach(e =>
			e.style.fontSize=fs);
		this.msg(''); // so that the little dot from border radius doesn't show
		this.create_lobby_buttons();
		this.create_game_buttons();
		this.create_high_score_list();
		this.start_chat();
	}
	start_chat(){
		const chat_container = document.getElementById('chat_container');
		const chat_input = document.createElement('input');
		const chat_output = document.createElement('ul');
		[chat_input, chat_output].forEach((e, i) => {
			chat_container.appendChild(e);
			e.style.width = this.cell_w*9;
			e.style.height = this.cell_w*(i==0 ? 1:3);
			e.style.fontSize = this.font_size;
		});
		new Chat(chat_input, chat_output, 'sudoku', this.game.username, 'Message to your friends....');
		chat_input.focus();
	}
	create_lobby_buttons(){
		// level and start
		const e = document.getElementById('lobby_buttons');
		['Easy', 'Medium', 'Hard', 'Start!'].forEach(l => {
			const btn = create_element('button', {innerHTML: l, style: 'height:'+
				this.t_cell_h+'; width:'+this.t_cell_h*2.2+'; font-size:'+
				this.font_size, class: 'regular_button', dataset: {clicked: 'false'}});
			btn.onclick = (e) => {
				const b = e.srcElement;
				const clicked = b.dataset.clicked=='true';
				this.lobby_buttons_remove_highlight();
				clicked ? '' : b.classList.add('highlighted_button');
				const action = clicked ? '(reset)' : l.toLowerCase();
				b.dataset.clicked = !clicked;
				this.game.comms.send_desired_level(action);
			};
			if(l=='Start!')
			{
				btn.style.backgroundColor='grey';
				btn.style.color='black';
				btn.onclick = () => this.game.comms.ask_to_start_now();
			}
			e.appendChild(btn);
		});
		e.appendChild(create_element('br'));
		// share buttons
		const btn = create_element('button', {innerHTML: 'Invite a friend',
			style: 'height:'+this.t_cell_h*0.8+'; width:'+this.t_cell_h*9.6+
			'; font-size:'+this.font_size, class:'share_button'});
		const msg = 'I challenge you to Sudoku at http://poco.la/sudoku !';
		btn.onclick = (e) =>
			this.using_mobile ? this.mobile_share(e, msg) : this.pc_share(e, msg);
		e.appendChild(btn);
	}
	mobile_share(e, msg){
		const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg);
		window.location.href = url;
	}
	pc_share(e, msg){
		const tempInput = document.createElement('input');
		tempInput.style = 'position: absolute; left: -1000px; top: -1000px';
		tempInput.value = msg;
		document.body.appendChild(tempInput);
		tempInput.select();
		document.execCommand('copy');
		document.body.removeChild(tempInput);
		e.srcElement.classList.add('activated_share');
		e.srcElement.innerHTML = 'Paste copied message in Whatsapp';
	}
	lobby_buttons_remove_highlight(){
		document.querySelectorAll('button').forEach(button => {
			button.classList.remove('highlighted_button');
			button.dataset.clicked='false';
		});
	}
	create_game_buttons(){
		const e = document.getElementById('game_buttons');
		const btn = create_element('button', {style: 'height:'+this.t_cell_h+
			'; width:'+this.t_cell_h*4+'; font-size:'+this.font_size+';',
		innerHTML: 'Quit', class: 'regular_button'});
		btn.onclick = ()=> {
			btn.innerHTML = btn.innerHTML=='Quit' ? 'Back to lobby' : 'Quit';
			this.game.game_button_pressed();
		};
		e.appendChild(btn);
	}
	build_new_board(board_array, board_show){
		this.strikes = 0;
		this.strike_cells = [];
		// load the board received from the server
		this.a = board_array;
		this.show = board_show;
		if(running_local) // make 'true' to test end of game
		{
			// create board that is missing only one number, and print it
			this.show = Array(9).fill().map(() => (Array(9).fill().map(() => 1)));
			this.show[1][1] = 0;
			this.show[1][0] = 0;
		}
		// create sudoku and active_number grids, and start game timer
		this.create_sudoku_grid();
		this.create_active_numbers_bar();
		this.reset_all_cell_backgrounds(1);
		this.timer_start();
		// set up keboard listener (for entering active_number)
		document.addEventListener('keydown', (e) => {
			if (e.repeat || e.key<'1' || e.key>'9')
				return;
			this.reset_all_cell_backgrounds(parseInt(e.key));
		});
	}
	create_sudoku_grid(){
		const container = document.getElementById('sudoku_container');
		container.innerHTML = '';
		// create new grid
		const table_e = create_element('table', {id: 'sudoku_table'});
		container.appendChild(table_e);
		// create top caption
		table_e.appendChild(create_element('caption',
			{innerHTML: this.game.level.toUpperCase(),
				style: 'font-size: '+this.font_size}));
		// create the cells of the table (by 3 colgroups separately)
		for(let i=0; i<3; i++)
		{
			const colgroup_e = create_element('colgroup', {className: 's_colgroup'});
			for(let j=0; j<3; j++)
				colgroup_e.appendChild(create_element('col'));
			table_e.appendChild(colgroup_e);
		}
		for(let b=0; b<3; b++)
		{
			const body_e = create_element('tbody', {className: 's_tbody'});
			table_e.appendChild(body_e);
			for(let r=0; r<3; r++)
			{
				const row_e = create_element('tr');
				body_e.appendChild(row_e);
				for(let t=0; t<9; t++)
				{
					// Sudoku grid cell defined here
					const row = r+b*3, col = t;
					const w = this.cell_w;
					const fs = this.font_size*1.65;
					const style = 'width:'+w+'px; height:'+w+'px; font-size:'+fs+'px';
					const td_e = create_element('td',
						{className: 'number_box', style: style, innerHTML:
						this.show[row][col] ? this.a[row][col] : '',
						id: String(row)+String(col)});
					td_e.onclick = (e) => {
						e.preventDefault();
						this.cell_clicked(td_e, row, col);
					};
					td_e.onmouseover = (e) =>
						e.srcElement.style.backgroundColor = 'rgb(235,235,235)';
					td_e.onmouseout = () => this.reset_all_cell_backgrounds();
					row_e.appendChild(td_e);
				}
			}
		}
	}
	create_active_numbers_bar(){
		const container = document.getElementById('numbers_container');
		container.innerHTML = ''; // erase previous
		this.active_numbers = [];
		const table_numbers_e = create_element('table');
		table_numbers_e.style.backgroundColor='white'; // transparent hover...
		table_numbers_e.style.border = 'solid medium rgb(18,70,105)';
		container.appendChild(table_numbers_e);
		const tr_e = create_element('tr');
		table_numbers_e.appendChild(tr_e);
		for(let t=1; t<10; t++)
		{
			// active number cell created here
			const w = this.cell_w*1.01;
			const fs = this.font_size*1.65;
			const style = 'width:'+w+'px; height:'+w+'px; font-size:'+fs+'px';
			const count = this.count_number_showings(t);
			const td_e = create_element('td', {className: 'number_box',
				id: 'active'+t, innerHTML: count==9 ? '.' : t, style: style});
			td_e.onclick = () => this.active_number_clicked(t);
			tr_e.appendChild(td_e);
			this.active_numbers[t] = td_e;
		}
	}
	show_games_played(games){
		document.getElementById('games_to_date').innerHTML =
			'Games played to date: '+games;
	}
	show_rivals_table(rivals){ // during the game
		// find the rivals table
		const table = document.getElementById('players_table');
		table.width = this.cell_w*9.5;
		table.innerHTML = '';
		// create header row
		const header_r = create_element('tr');
		table.appendChild(header_r);
		['Player', 'Squares left', 'Strikes'].forEach((t) => {
			header_r.appendChild(create_element('th',
				{className: 'player_name',
					style: ('height: '+this.t_cell_h+'; font-size: '+this.font_size),
					innerHTML: t}));
		});
		// populate the table with the players
		rivals.forEach((p, i) => {
			p.sq_left = p.sq_left!=null ? p.sq_left : this.squares_left();
			p.strikes = p.strikes!=null ? p.strikes : 0;
			const row = create_element('tr', {style: 'background-color: white'});
			table.appendChild(row);
			// content of each player's row
			[p.username, p.sq_left, p.strikes].forEach(t => {
				const cell = create_element('td',
					{style: 'height: '+this.cell_w*0.7+'; font-size: '
					+this.cell_w*0.4+'; background: '+(p.strikes<3 ? 'rgb(230,230,230)' : 'red'), innerHTML: t});
				if(p.username==this.game.username)
				{
					// highlight this player's entry differently
					cell.style.background = 'rgba(255,137,0,0.4)';
					// if this player is leading, highlight board in green
					document.getElementById('sudoku_table').style.border =
						'8px solid '+(i==0 && rivals.length>1 &&
						rivals[i+1].sq_left > p.sq_left ? 'lightgreen' : '');
				}
				row.appendChild(cell);
			});
		});
	}
	show_waiting_players_in_lobby(waiting_players){
		const t = document.getElementById('waiting_players');
		t.innerHTML = '';
		t.style.width = this.cell_w*9;
		// create header row
		const header_row = create_element('tr');
		t.appendChild(header_row);
		['Player', 'Level?', 'Easy', 'Medium', 'Hard'].forEach((t) => {
			header_row.appendChild(create_element('th', {innerHTML: t, style:
				'height: '+this.t_cell_h+'; font-size: '+this.font_size}));
		});
		// populate the table with the players
		waiting_players.forEach(p => {
			const row = create_element('tr', {style: 'background-color: white'});
			t.appendChild(row);
			// create scores object (easy, medium, high)
			const scores_o = {easy: '-', medium: '-', hard: '-'};
			p.scores.forEach(s=> scores_o[s.level] = s.score);
			[p.username, p.desired_level, scores_o.easy, scores_o.medium,
				scores_o.hard].forEach(t => {
				const style = 'padding: 5px 5px; color: rgba(0, 0, 0, 0.6); height:'
					+ this.t_cell_h+'; font-size:'+this.font_size +
					'; font-align: center; background: '+
					(p.username==this.game.username ?
						'rgba(255,137,0,0.4)' : 'rgb(230,230,230)') +
					'; font-weight: '+ (t==this.game.user.desired_level ? 'bold':'');
				const content = t==p.desired_level && t ? t[0].toUpperCase()+t.slice(1) : t;
				row.appendChild(create_element('td',
					{innerHTML: content, style: style}));
			});
		});
	}
	show_high_scores(high_scores){
		['easy', 'medium', 'hard'].forEach(l => {
			const hs = (high_scores && high_scores.find(s=>s.level == l));
			if(!hs)
				return;
			document.getElementById(l+'_username').innerHTML = hs['username'];
			document.getElementById(l+'_score').innerHTML = hs['score'];
		});
	}
	create_high_score_list(){
		const t = document.getElementById('high_scores_table');
		t.style.width = this.cell_w*9;
		// create table header row
		const r = create_element('tr');
		['Level', 'Name', 'High score'].forEach(label => {
			r.appendChild(create_element('th', {innerHTML: label, style:
			'height:'+this.t_cell_h+'; font-size:'+this.font_size}));
		});
		t.appendChild(r);
		// add high scores rows to table
		['easy', 'medium', 'hard'].forEach(l => {
			const tr = create_element('tr', {id: l});
			['level', 'username', 'score'].forEach(key => {
				tr.appendChild(create_element('td', {id: l+'_'+key, innerHTML:
				key=='level' ? l:'', style: 'padding: 7px 20px; background: rgba(230,230,230,1); color: rgba(0, 0, 0, 0.6); height: '+
				this.t_cell_h+'; font-size:'+this.font_size}));
			});
			t.appendChild(tr);
		});
	}
	cell_clicked(e, row, col){
		const strike = this.strike_cells[0];
		this.erase_strike_cells();
		if(!this.active_number)
			return;
		if(this.show[row][col])
		{
			// clicked on showing cell => change active number
			this.active_number = this.a[row][col];
		}
		else if(this.a[row][col] == this.active_number)
		{
			// correct guess
			e.style.color = '#a1a1a1';
			e.innerHTML = this.active_number;
			this.show[row][col] = 1;
			if(this.count_number_showings(this.active_number)==9)
			{
				// finished all of this number on the board
				this.active_numbers[this.active_number].innerHTML = '.';
				document.body.className = 'all_numbers_completed'; // blink
				setTimeout(()=>document.body.className = 'game_bg_img', 250);
			}
		}
		else
		{
			// incorrect guess
			if(e == strike)
				return; // only mark strike if first strike on current cell
			e.style.color = 'red';
			e.innerHTML = this.active_number;
			this.strike_cells.push(e);
			this.strikes++;
		}
		this.reset_all_cell_backgrounds();
		// let the other players know my game status
		this.game.comms.send_board(this.show, this.squares_left(), this.strikes);
	}
	erase_strike_cells(){
		this.strike_cells.forEach(c => c.innerHTML = '');
		this.strike_cells = [];
	}
	show_countdown(time){
		document.getElementById('countdown_timer').innerHTML =
			'Next game in: '+time+' seconds';
	}
	show_now_playing(now_playing){
		const e = document.getElementById('now_playing');
		if(!now_playing.length)
		{
			e.innerHTML='';
			return;
		}
		e.innerHTML = '<b>Now fighting in the server:</b><br>';
		now_playing.forEach(g => e.innerHTML+='['+g.join(', ')+'] ');
	}
	active_number_clicked(num){
		// reset cells and highlight the new active number
		this.erase_strike_cells();
		this.reset_all_cell_backgrounds(num);
	}
	timer_start(){
		this.timer_stop();
		this.timer_start_time = new Date();
		this.timer_id = setInterval(() => this.timer_draw(), 1000);
		this.timer_draw();
	}
	timer_stop(){
		clearInterval(this.timer_id);
	}
	timer_draw(){
		let s = (new Date() - this.timer_start_time)/1000;
		const m = String(Math.floor(s/60));
		s = Math.round(s-m*60);
		s = s<10 ? '0'+String(s) : String(s);
		const e = document.getElementById('timer_container');
		e.style.fontSize = this.font_size;
		e.innerHTML = m+':'+s;
	}
	reset_all_cell_backgrounds(n = this.active_number){
		this.active_number = n;
		// remove highlight from all active numbers & highlight the one active
		this.active_numbers.forEach((e,i) =>
			e.style.backgroundColor = i==n ? 'rgba(58, 110, 145, 0.4)' : 'white');
		// highlight all 'shown' numbers that are the new active_number
		for(let r=0; r<9; r++)
			for(let c=0; c<9; c++)
			{
				const e = document.getElementById(String(r)+String(c));
				e.style.backgroundColor = (this.a[r][c]==this.active_number &&
					this.show[r][c]) ? 'lightgrey' : 'white';
			}
	}
	count_number_showings(number){
		let retval = 0;
		for(let r=0; r<9; r++)
			for(let c=0; c<9; c++)
				retval += (this.a[r][c]==number && this.show[r][c]==1);
		return retval;
	}
	squares_left(){
		return this.show.flat().filter(x => x==0).length;
	}
	msg(txt){
		const e = document.getElementById('msg');
		e.innerHTML = txt;
		e.style.display = txt=='' ? 'none' : 'inline';
	}
	game_over(win, txt){
		this.timer_stop();
		// change board color & msg user
		[...document.getElementsByClassName('number_box')].forEach(e =>
		{
			e.style.backgroundColor = win ? 'lightgreen' : 'pink';
			e.onclick = null;
			e.onmouseover = null;
			e.onmouseout = null;
		});
		this.msg((win ? 'You Win! ' : 'You Lose! ') + txt);
	}
}
function create_element(tag, attributes) {
	const element = document.createElement(tag);
	for (const attribute in attributes)
	{
		attribute=='innerHTML' ? element.innerHTML = attributes[attribute] :
			attribute=='className' ? element.className = attributes[attribute] :
				element.setAttribute(attribute, attributes[attribute]);
	}
	return element;
}
// 361 - 353
