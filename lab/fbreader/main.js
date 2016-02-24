// main.js
var height 		= window.innerHeight - document.getElementsByTagName('nav')[0].offsetHeight - document.getElementsByTagName('footer')[0].offsetHeight - 30;
document.getElementById('my_likes').style.height = height + 'px';
document.getElementById('page_content').style.height = height + 'px';
var FBReaderStorage = 
{
	data: 	{},
	temp: function (key, value) {
		if (typeof this.data[key] === "undefined")
		{
			this.data[key] = [];
		}
		this.data[key] = this.data[key].concat(value);
	},
	flush: function (key)
	{
		if (typeof this.data[key] === "undefined")
		{
			return true;
		}
		delete this.data[key];
	},
	get: function (key)
	{
		if (typeof this.data[key] === "undefined")
		{
			return [];
		}
		return this.data[key];
	}
};

function classNameMaintainer ()
{
	this.useClassList = document.body.classList ? true : false;
}
classNameMaintainer.prototype.has = function (element, className) 
{
	var expression = '(^| )' + className + '( |$)';
	return this.useClassList ? element.classList.contains(className) : (new RegExp(expression), 'gi').test(element.className);
};
classNameMaintainer.prototype.add = function (element, className)
{
	if (this.useClassList)
	{
		return element.classList.add(className);
	}
	return element.className += ' ' + className;
};
classNameMaintainer.prototype.remove = function (element, className)
{
	if (this.useClassList)
	{
		return element.classList.remove(className);
	}
	return element.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), '');
}
document.getElementById('page_content').addEventListener('scroll', function(event){
	if (this.scrollTop == 0)
	{
		return true;
	}
	if ((this.scrollTop / (this.scrollHeight - this.clientHeight)) > 0.8)
	{
		return loading_posts_from_page(null, true);
	}
}, true);

var classNameHelper = new classNameMaintainer();

function FBPagesLikesListRenderer ()
{
	var html = [];
	FBReaderStorage.get('likes').forEach(function(item, i){
		html.push(
			'<li>' + 
				'<a class="page_id" href="#" data-id="' + item.id + '">' + item.global_brand_page_name + '</a><span class="bullet"></span>' + 
			'</li>'
		);
	});
	FBReaderStorage.flush('likes');
	document.getElementById('my_likes').innerHTML = html.join("");

	var list_loading_block = document.getElementById('loading'),
		objClassName = new classNameMaintainer();

	
	objClassName.add(list_loading_block, 'hide');

	Array.prototype.forEach.call(document.querySelectorAll('a.page_id'), function(item, i){
		item.addEventListener('click', function (obj)
		{
			obj.preventDefault();
			document.getElementById('page_title').innerHTML = '<h2><a href="https://www.facebook.com/' + this.getAttribute('data-id') + '">' + this.textContent+ '</a></h2>';
			loading_posts_from_page(this.getAttribute('data-id'));
		});
	});
}

function FBPagePostsListRenderer (isCleared)
{
	var html = [];
	FBReaderStorage.get('posts').forEach(function(item, i){
		html.push(
			[
				'<div class="post clearfix">',
					'<h4><a href="#">' + (typeof item.message === "undefined" || item.message.length == 0 ? '...&nbsp;' : (item.message.length > 20 ? item.message.substr(0 , 20) + '...' : item.message)) + '</a></h4>',
					'<div class="row-fluid message hide">',
						'<div class="col-md-6">',
							'<p>' + (typeof item.message === "undefined" ? '...' : nl2br(item.message).replace(new RegExp('\\b(http|https)(://[a-zA-Z0-9&_\\./\\?\\=]+)\\b', 'gi'), '<a href="$1$2">$1$2</a>')) + '</p>',
							'<p>',
								(typeof item.link !== "undefined" ? '<a href="' + item.link + '">連結</a>' : ''),
							'</p>',
						'</div>',
						'<div class="col-md-6">',
							(typeof item.full_picture !== "undefined" ? '<img class="img-responsive img-rounded" src="' + item.full_picture + '" />' : ''),
						'</div>',
					'</div>',
				'</div>'
			].join("")
		)
	});

	if (typeof isCleared !== "undefined" && isCleared === true)
	{
		Array.prototype.forEach.call(document.querySelectorAll('div.post'), function(item, i){
			item.parentNode.removeChild(item);
		});
	}

	if (html.length <= 0)
	{
		html.push('<div class="post no_content">此專頁無任何發文！</div>');
	}

	// document.getElementById('btn_continue_loading').insertAdjacentHTML('beforebegin', html.join(""));
	document.getElementById('page_content').innerHTML += html.join("");

	var objClassName = new classNameMaintainer();
	Array.prototype.forEach.call(document.querySelectorAll('div.post'), function(item, i){
		item.onclick = function (obj)
		{
			obj.preventDefault();
			Array.prototype.forEach.call(document.querySelectorAll('div.message'), function(message, i){
				if (objClassName.has(message, 'hide') === false)
				{
					objClassName.add(message, 'hide');
				}
			});
			Array.prototype.forEach.call(item.children, function (detail, i){
				if (objClassName.has(detail, 'message'))
				{
					objClassName.remove(detail, 'hide');
				}
			});
		}
	});
	classNameHelper.remove(document.getElementById('loading'), 'show');
}


function loading_likes_lists (page_id)
{
	var base_url 	= '/me/likes?fields=likes,unread_message_count,name,global_brand_page_name&limit=100';
	FB.api(
		base_url + (typeof page_id !== "undefined" ? '&after=' + page_id : ''), 'GET', function(response){
			if (typeof response === "undefined" || !response)
			{
				return;
			}
			if (response.data.length == 0)
			{
				return FBPagesLikesListRenderer();
			}
			FBReaderStorage.temp('likes', response.data);
			return loading_likes_lists(response.paging.cursors.after);
		}
	);
}
function loading_posts_from_page (id, page_id)
{

	var base_url = '/' + id + '/posts?fields=message,story,created_time,full_picture,id,link,status_type,type,caption,description';
	if (page_id)
	{
		var next = 	FBReaderStorage.get('post.next_id');
		base_url =	next.pop();
	}
	if (!base_url)
	{
		return;
	}
	classNameHelper.add(document.getElementById('loading'), 'show');
	var _page_id = page_id;
	FB.api(
		base_url, 'GET', function(response)
		{
			if (typeof response === "undefined" || !response)
			{
				return;
			}
			var isCleared = false;
			if (typeof _page_id === "undefined")
			{
				FBReaderStorage.flush('posts');
				FBReaderStorage.flush('post.next_id');
				isCleared = true;
			}
			
			FBReaderStorage.temp('posts', response.data);
			FBReaderStorage.temp('post.next_id', response.paging && response.paging.next ? response.paging.next : '');
			return FBPagePostsListRenderer(isCleared);
		}
	);
}

function doLogin ()
{
	FB.login(function(){change_login_status();loading_likes_lists();}, {"scope":"user_videos,user_photos,user_likes"});
}
function logout ()
{
	FB.logout(function(){
		window.location.reload();
	});
}
function change_login_status ()
{
	var base_url = '/me?fields=name,id';
	FB.api(base_url, 'GET', function(response){
		document.getElementById('login_status').innerHTML = [
			'<li><img src="//graph.facebook.com/' + response.id + '/picture?type=small" /> ' + response.name + '</li>',
			'<li><a id="logout" href="#">登出</a></li>'
		].join("");
		document.getElementById('logout').onclick = logout;
	})
} 
function onLoad (response)
{
	if (response.status === 'connected')
	{
		change_login_status();
		loading_likes_lists();
	} else if (response.status === 'not_authorized') 
	{
		doLogin();
	} else 
	{
		doLogin();
	}
}
window.fbAsyncInit = function() {
	FB.init({
		appId      : '535436796624365',
		xfbml      : true,
		version    : 'v2.5'
	});
	FB.getLoginStatus(onLoad);
};

(function(d, s, id){
	var js, fjs = d.getElementsByTagName(s)[0];
	if (d.getElementById(id)) {return;}
	js = d.createElement(s); js.id = id;
	js.src = "//connect.facebook.net/zh_TW/sdk.js";
	fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));