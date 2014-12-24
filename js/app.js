( function ( ) {
	'use strict';


	angular.module( 'secret-santa', [
	] );


	angular.module( 'secret-santa' ).service( 'human-service', [ '$q', function ( $q ) {
		var shuffle = function ( o ) {
		    for( var j, x, i = o.length; i; j = ( Math.random( ) * i ) | 0, x = o[ --i ], o[ i ] = o[ j] , o[ j ] = x );
		    return o;
		};

		var shuffleUntilOk = function ( humans ) {
			var cand = humans.slice( ),
				len = humans.length,
				ok = false,
				i = -1;

			console.clear( );

			while ( !ok ) {
				cand = shuffle( cand );
				ok = true;
				i = len + 1;

				cand.push( cand[ 0 ] );

				while ( i > 1 ) {
					i --;
					ok &= !( cand[ i ].email in cand[ i - 1 ].restrict );
					if ( !ok ) {
						console.log( 'found restriction, skipping', cand[ i ].email, cand[ i - 1 ].email );
						break;
					}
				}

				if ( ok ) {
					return cand;
				}
			}
		};

		var s = {
			model: {
				humans: [ ],
			},
			addHuman: function ( email ) {
				if ( email ) {
					s.model.humans.push( {
						email: email,
						name: undefined,
						restrict: { }
					} );
				}
			},
			extractHumansFromText: function ( text ) {
				return text.match( /[^\s]+@[^\s,]+/g ).filter( function ( item, pos, self ) {
					return self.indexOf( item ) == pos;
				} );
			},
			matchHumans: function ( ) {
				var def       = $q.defer( ),
					scrambled = shuffleUntilOk( s.model.humans.slice( ) ),
					matches   = { },
					i         = scrambled.length,
					last      = scrambled[ 0 ];

				while( i ) {
					i --;
					var h = scrambled[ i ]
					matches[ last.email ] = h;
					last = h;
				}

				def.resolve( matches );
				return def.promise;
			},
			removeHuman: function ( human ) {
				s.model.humans.splice( s.model.humans.indexOf( human ), 1 );
			}
		};

		return s;
	} ] );


	angular.module( 'secret-santa' ).controller( 'humans-controller', [ '$scope', '$http', '$timeout', 'human-service', function ( $scope, $http, $timeout, humanService ) {
		$scope.model = {
			humans: humanService.model.humans,
			email: undefined,
			matches: { },
			sort: ''
		};

		$scope.addHuman = function ( ) {
			humanService.addHuman( $scope.model.email );
			$scope.model.email = undefined;
		};

		$scope.addHumanOnReturn = function ( $event ) {
			if( $event.which == 13 ) {
				$scope.addHuman( );
			}
		};

		$scope.extractEmailsFromPasteEvent = function ( $pasteEvent ) {
			var data = $pasteEvent.clipboardData,
				humans = [];

			humans.concat.apply( humans, data.types.map( data.getData.bind( data ) ).map( humanService.extractHumansFromText ) ).forEach( humanService.addHuman );

			$timeout( function ( ) {
				$pasteEvent.target.value = '';	
			} );
			
		};

		$scope.haveMatches = function ( ) {
			return Object.keys( $scope.model.matches ).length;
		}

		$scope.matchHumans = function ( ) {
			humanService.matchHumans( ).then( function ( matches ) {
				$scope.model.matches = matches;
			} );
		};

		$scope.removeHuman = function ( human ) {
			humanService.removeHuman( human );
		};

		$scope.sendEmails = function ( ) {
			var from = 'Santa Claus <santa.claus@north.pole>',
				subject = 'Sortii au decis';
			for ( var to in $scope.model.matches ) {
				$http( {
					method: 'POST',
					url: 'https://api.mailgun.net/v2/sandbox4e24519639e04dce9449aa32ff30ffed.mailgun.org/messages',
					transformRequest: function ( data ) {
						return Object.keys( data ).map( function ( k ) {
							return encodeURIComponent( k ) + '=' + encodeURIComponent( data[ k ] );
						} ).join( '&' );
					},
					headers: {
						'Authorization': 'Basic YXBpOmtleS1kNjMxMTE0MjU1OGRkODMzYWI1YTU4MGI0OWEwMjhiOQ==',
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					data: {
						to: '<' + to + '>',
						from: from,
						subject: subject,
						text: 'Sortii au decis ca tu sa fii mosul pentru: ' + ( $scope.model.matches[ to ].name || $scope.model.matches[ to ].email ) + '!'
					},
				} );
			}
		};

		$scope.toggleRestrictHumans = function ( a, b ) {
			var areRestricted = a.restrict[ b.email ];
			if ( areRestricted ) {
				delete a.restrict[ b.email ];
				delete b.restrict[ a.email ];
			} else {
				a.restrict[ b.email ] = true;
				b.restrict[ a.email ] = true;
			}
			return !areRestricted;
		};
	} ] );


} )( );