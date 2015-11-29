'use strict';

var _unitCtrl = function(isHero) {
	return function ($scope, globalContent, NODE, Unit, UI, KV, Locale, Config) {
		if (!globalContent.isOpen) return;

		window.scope = $scope;

		$scope.isHero = isHero;
		$scope.ready = false;
		$scope.abilityList = [];
		$scope.ability = null;

		$scope._newUnitFork = null;
		$scope._newUnitForkLang = true;
		$scope._newUnitName = "";

		$scope._newUnassignedKey = "";
		$scope._newUnassignedValue = "";

		var _globalListKey = isHero ? "heroList" : "unitList";
		var _globalConfigKey = isHero ? "heroConfig" : "unitConfig";
		var _filePath = isHero ? Unit.heroFilePath : Unit.filePath;

		$scope.currentTab = Unit.AttrList[0];
		$scope.setCurrentTab = function (current) {
			$scope.currentTab = current;
		};

		// ================================================================
		// =                           Function                           =
		// ================================================================
		$scope.setAbility = function (ability) {
			$scope.ability = ability;
		};

		// ==========> New
		$scope.newEntity = function(source) {
			$scope._newUnitFork = source;
			$scope._newUnitForkLang = true;
			$scope._newUnitName = $scope._newUnitFork ? $scope._newUnitFork._name + "_clone" : "Undefined";

			UI.modal("#newUnitMDL");
		};

		$scope.confirmNewEntity = function() {
			var _checkResult = $scope.renameCheck($scope._newUnitName);

			if(typeof _checkResult === "string") {
				$.dialog({
					title: "OPS",
					content: _checkResult
				}, function() {
					UI.modal.highlight("#newUnitMDL");
				});
				return;
			} else {
				var _clone = new Unit($scope._newUnitFork ? $scope._newUnitFork.kv.clone() : null);
				_clone._name = $scope._newUnitName;
				_clone._changed = true;

				if($scope._newUnitFork) {
					// Clone Language
					if($scope._newUnitForkLang) {
						$.each(globalContent.languageList, function(i, lang) {
							lang.map[Language.unitAttr(_clone, "")] = lang.map[Language.unitAttr($scope._newUnitFork, "")];
							lang.map[Language.unitAttr(_clone, "bio")] = lang.map[Language.unitAttr($scope._newUnitFork, "bio")];
						});
					}

					// Clone Configuration
					var _abilities = $scope.config.abilities = $scope.config.abilities || {};
					var _ability = _abilities[$scope._newUnitFork._name] = _abilities[$scope._newUnitFork._name] || {};
					var _cloneEntity = _abilities[_clone._name] = _abilities[_clone._name] || {};
					$.extend(_cloneEntity, _ability, true);
					if (_cloneEntity.editorAliasName) {
						_cloneEntity.editorAliasName += " copy";
					}

					var _index = $.inArray($scope._newUnitFork, $scope.abilityList);
					$scope.abilityList.splice(_index + 1, 0, _clone);
				} else {
					$scope.abilityList.push(_clone);
				}
				$scope.setAbility(_clone);

				$("#newUnitMDL").modal('hide');
			}
		};

		// ==========> Rename
		$scope.renameCheck = function(newName) {
			for(var i = 0 ; i < $scope.abilityList.length ; i += 1) {
				if($scope.abilityList[i]._name === newName) {
					return Locale('conflictName');
				}
			}
			return true;
		};

		$scope.renameCallback = function(newName, oldName, entity) {
			if(entity.kv.get("override_hero", false)) return;

			$.each(globalContent.languageList, function(i, lang) {
				if(lang.map[oldName] !== undefined) lang.map[newName] = lang.map[oldName];
				delete lang.map[oldName];

				if(lang.map[oldName + "_bio"] !== undefined) lang.map[newName + "_bio"] = lang.map[oldName + "_bio"];
				delete lang.map[oldName + "_bio"];
			});
		};

		// ==========> Wearable
		$scope.newWearable = function () {
			var _wearable = new KV("wearable", [new KV("ItemDef")]);
			$scope.ability.kv.assumeKey('Creature.AttachWearables', true).value.push(_wearable);
		};

		// ==========> Unassigned
		$scope.newUnassigned = function () {
			UI.modal("#newUnassignedMDL");
		};
		$scope.confirmNewUnassigned = function() {
			if(!$scope._newUnassignedKey.match(/^[\w\d_]+$/)) {
				$.dialog({
					title: Locale('Error'),
					content: Locale('illegalCharacter'),
				});
			} else if($scope.ability.kv.getKV($scope._newUnassignedKey, false)) {
				$.dialog({
					title: Locale('Error'),
					content: Locale('duplicateDefined'),
				});
			} else {
				$scope.ability.kv.value.push(new KV($scope._newUnassignedKey, $scope._newUnassignedValue));
				$scope.ability.refreshUnassignedList();
				$scope._newUnassignedKey = "";
				$scope._newUnassignedValue = "";
				$("#newUnassignedMDL").modal('hide');
			}
		};
		$scope.refreshUnassigned = function () {
			$scope.ability.refreshUnassignedList();
		};

		// ================================================================
		// =                        File Operation                        =
		// ================================================================
		// Read Config file
		if (!globalContent[_globalConfigKey]) {
			NODE.loadFile(Unit[_globalConfigKey], "utf8").then(function (data) {
				$scope.config = JSON.parse(data);
			}, function () {
				$scope.config = {};
			}).finally(function () {
				globalContent[_globalConfigKey] = $scope.config;
			});
		} else {
			$scope.config = globalContent[_globalConfigKey];
		}

		// Read Unit file
		if (!globalContent[_globalListKey]) {
			NODE.loadFile(_filePath, "utf8").then(function (data) {
				var _kv = KV.parse(data);
				$.each(_kv.value, function (i, unit) {
					if (typeof  unit.value !== "string") {
						var _unit = Unit.parse(unit);
						_LOG("Unit", 0, "实体：", _unit._name, _unit);

						$scope.abilityList.push(_unit);
					}
				});

				globalContent[_globalListKey] = $scope.abilityList;
				$scope.setAbility($scope.abilityList[0]);

				setTimeout(function () {
					$(window).resize();
				}, 100);
			}, function () {
				$.dialog({
					title: "OPS!",
					content: "Can't find "+_filePath+" <br/> 【打开"+_filePath+"失败】",
				});
			}).finally(function () {
				$scope.ready = true;
			});
		} else {
			$scope.abilityList = globalContent[_globalListKey];
			$scope.setAbility($scope.abilityList[0]);
			$scope.ready = true;
		}

		// 多语言支持
		$scope.languageList = globalContent.languageList;
		globalContent.languageList._promise.then(function () {
			$scope.language = $scope.languageList[0];
		});

		// ================================================================
		// =                     List Item Operation                      =
		// ================================================================
		$scope.setAbilityMarkUsage = function(usage) {
			if(!$scope.config) return;

			var _abilities = $scope.config.abilities = $scope.config.abilities || {};
			var _ability = _abilities[_menuAbility._name] = _abilities[_menuAbility._name] || {};
			if(usage) {
				_ability.markUsage = usage;
			} else {
				delete _ability.markUsage;
			}
		};

		$scope.setAbilityMarkColor = function(color) {
			if(!$scope.config) return;

			var _abilities = $scope.config.abilities = $scope.config.abilities || {};
			var _ability = _abilities[_menuAbility._name] = _abilities[_menuAbility._name] || {};
			if(color) {
				_ability.markColor = color;
			} else {
				delete _ability.markColor;
			}
		};

		$scope.setAbilityEditorAlias = function() {
			if(!$scope.config) return;

			var _abilities = $scope.config.abilities = $scope.config.abilities || {};
			var _ability = _abilities[_menuAbility._name] = _abilities[_menuAbility._name] || {};

			var $input = $("<input type='text' class='form-control' />");
			$input.val(_ability.editorAliasName || "");
			$.dialog({
				title: "Alias Name in Editor 【编辑器中的别名】",
				content: $input,
				confirm: true
			}, function(ret) {
				if(!ret) return;

				var _alias = $input.val();
				if(_alias) {
					_ability.editorAliasName = _alias;
				} else {
					delete _ability.editorAliasName;
				}
				$scope.$apply();
			});
			setTimeout(function() {
				$input.focus();
			}, 500);
		};

		$scope.copyAbility = function() {
			if(!_menuAbility) return;

			/*var _clone = new Unit(_menuAbility.kv.clone());
			_clone._name += "_clone";
			_clone._changed = true;

			// 复制配置
			var _abilities = $scope.config.abilities = $scope.config.abilities || {};
			var _ability = _abilities[_menuAbility._name] = _abilities[_menuAbility._name] || {};
			var _cloneAbility = _abilities[_clone._name] = _abilities[_clone._name] || {};
			$.extend(_cloneAbility, _ability, true);
			if(_cloneAbility.editorAliasName) {
				_cloneAbility.editorAliasName += " copy";
			}

			var _index = $.inArray(_menuAbility, $scope.abilityList);
			$scope.setAbility(_clone);
			$scope.abilityList.splice(_index + 1, 0, $scope.ability);*/
			$scope.newEntity(_menuAbility);
		};

		$scope.deleteAbility = function() {
			if(!_menuAbility) return;

			$.dialog({
				title: "Delete Confirm 【删除确认】",
				content: "Do you want to delete '"+_menuAbility._name+"'",
				confirm: true
			}, function(ret) {
				if(!ret) return;

				var _isCurrent = $scope.ability === _menuAbility;
				common.array.remove(_menuAbility, $scope.abilityList);
				if(_isCurrent) {
					$scope.setAbility($scope.abilityList[0]);
				}
				$scope.$apply();
			});
		};

		// ================================================================
		// =                              UI                              =
		// ================================================================
		// Select ability
		$scope.setAbilityMouseDown = function (ability) {
			$scope.setAbility(ability);
		};

		// List Container layout
		var winWidth;
		$(window).on("resize.abilityList", function () {
			setTimeout(function () {
				var _winWidth = $(window).width();
				var $abilityCntr = $(".abilityCntr");

				if (_winWidth !== winWidth && $abilityCntr.length) {
					var _left = $abilityCntr.offset().left;
					$("#listCntr").outerWidth(_left - 15);
					$("#newItem").outerWidth(_left - 15);
					winWidth = _winWidth;
				}
			}, 100);
		}).resize();

		// Prevent list container scroll
		$("#listCntr").on("mousewheel.abilityList", function (e) {
			var _my = $(this);

			var _delta = e.originalEvent.wheelDelta;
			var _top = _my.scrollTop();
			var _height = _my.outerHeight();
			var _scrollHeight = _my[0].scrollHeight;

			if ((_delta > 0 && _top <= 0) || (_delta < 0 && _top + _height >= _scrollHeight)) {
				e.preventDefault();
			}
		});

		// Right click on list item
		$("#abilityMenu").hide();
		var _menuAbility;
		$(document).on("contextmenu.abilityList", "#listCntr .listItem", function (e) {
			var $menu = $("#abilityMenu").show();
			common.ui.offsetWin($menu, {
				left: e.originalEvent.x,
				top: e.originalEvent.y
			});

			_menuAbility = angular.element(this).scope()._ability;
			refreshMenu("#abilityMenu");

			e.preventDefault();
			return false;
		});

		// =================================================================
		// =                          Application                          =
		// =================================================================
		$scope.$on("AppSaved",function() {
			$scope.setAbility($scope.ability);
		});

		$scope.$on("$destroy",function() {
			$(window).off("resize.abilityList");
			$("#listCntr").off("mousewheel.abilityList");
			$(document).off("contextmenu.abilityList");
		});
	};
};

hammerControllers.controller('unitCtrl', _unitCtrl(false));
hammerControllers.controller('heroCtrl', _unitCtrl(true));