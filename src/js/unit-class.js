import { EXP_TABLE } from "../data/hero-data";
import SKILL_TABLE from "../data/skill-data";
import STATE_TABLE from "../data/state-data";
import { ITEM_TABLE } from "../data/item-data";
import store from '../store';
import CreateMonster from './create-monster';
import CreateHero from './create-hero';
import { GetRange, GetRandom } from './public-random-range';
import PGET from '../js/public-static-get';
import coolTimeEvent from './cool-time-event';
import Vue from 'vue';


function Unit(obj = {}){
  this.id = 1000 + (Math.random()* 1000).toFixed(0)  // 编号
  this.$type = 'Hero';      // 单位类型
  this.$showName = 'unit' // 展示名称
  this.$level = 0;    // 等级
  this.$alive = true;
  this.$status = [];
  this.$skills = [];  // 技能列表

  // 属性方面
  this.$hp          = 600;  // 当前生命值
  this.$mp          = 400;  // 当前魔法值
  this.$maxHp       = 600;  // 生命最大值
  this.$maxMp       = 400;  // 魔法最大值
  this.$atk         = 10;   // 攻击
  this.$def         = 0;   // 防御
  this.$str         = 10;   // 力量
  this.$dex         = 10;   // 敏捷
  this.$con         = 10;   // 体质
  this.$int         = 10;   // 智力
  this.$critical    = 3; // 暴击几率
  this.$dodge       = 5; // 闪避几率
  this.$coolTimePer = 0;    // 冷却缩短
  this.$critiDmg    = 1.5;  // 暴击伤害倍数;
  this.$dmgDown     = [0,0]; // 伤害减免;
  this.$r           = {};

  switch(obj.$type){
    case 'Monster' : 
      CreateMonster.call(this, obj);
      break;
    case 'Hero' : 
      CreateHero.call(this, obj);
      break;
  }

  this.updateAttribute(); 
}

Unit.prototype = {
  startFight,
  endFight,
  updateAttribute,
  changeMp,
  changeHp,
  startFight,
  endFight,
  updateAttribute,
  changeMp,
  changeHp,
  getExp,
  getList,
  removeList,
  changeState,
  reset,
  dieDrop,
  itemSort,
  getItem,
  equip,
  demount,
  isEnoughInPackage,
  use,
}

/* --------------- */

function startFight(){

  for(let key in this.$flashCopy){
    this.$flashCopy[key] = _.cloneDeep(this[key]);
  }

  for(let state of this.$status){
    state.stateEvent && state.stateEvent(this);
  }

  this.updateAttribute();
}

function endFight(){

  for(let state of this.$status){
    state.stateEventTimer && clearInterval(state.stateEventTimer);
  }

  Object.assign(this, this.$flashCopy);

  !this.$alive && this.reset();

  this.updateAttribute();
}

function updateAttribute(){

  let hp_per = Math.min(this.$hp / (this.$r.$maxHp || this.$maxHp), 1);
  let mp_per = Math.min(this.$mp / (this.$r.$maxMp || this.$maxMp), 1);

  let promote = {
    // 基础值 基础百分 高级值 高级百分
    // ((默认 + 基础值) * (1 + 基础百分) + 高级值) * (1 +  高级百分)
    $maxHp       : [0,0,0,0],
    $maxMp       : [0,0,0,0],
    $atk         : [0,0,0,0],
    $def         : [0,0,0,0],
    $str         : [0,0,0,0],
    $dex         : [0,0,0,0],
    $con         : [0,0,0,0],
    $int         : [0,0,0,0],
    $critical    : [0,0,0,0],
    $dodge       : [0,0,0,0],
    $coolTimePer : [0,0,0,0],
    $critiDmg    : [0,0,0,0],
    $dmgDown : [0,0],
  }

  let data = (this.$equipments || []).concat(this.$status || []);

  for(let item of data){
    
    if(!item){
      continue;
    }

    let opt = item.equip || item.powerUp;

    for(let key in opt){

      let v = opt[key];

      if(!promote[key]){
        continue;
      }

      let index = 0,up = v;

      if(v instanceof Array){
        index = v[1];
        up = v[0];
      }

      promote[key][index] += up;
    }

  };

  for(let key in promote){
    let v = promote[key];
    if(key === '$dmgDown'){
      this.$r[key] = v;
      continue ;
    }
    this.$r[key] = Math.floor(((this[key] + v[0]) * (1 + v[1] / 100) + v[2]) * (1 + v[3] / 100));
  }

  this.$hp = Math.floor(hp_per * this.$r.$maxHp) || 0;
  this.$mp = Math.floor(mp_per * this.$r.$maxMp) || 0;

}

function changeMp(value) {

  let v = parseInt(v);

  if(!v){
    return false;
  }

  let mp = Math.min(this.$mp + v, this.$r.$maxMp);

  this.$mp = mp < 0 ? 0 : mp;

  return true;
}

function changeHp(value) {

  let v = parseInt(value);

  if(!v || this.$hp <= 0){
    return false;      
  }

  let hp = Math.min(this.$hp + value, this.$r.$maxHp);  // 更新Hp的值;
  
  if(hp <= 0){ 
    this.$hp = 0;
    this.$alive = false;
  }else{
    this.$hp = hp;
  }

  return true;
}

function getExp(value) {
  
  let ExpTable = EXP_TABLE,
      v = parseInt(value);

  if(!v || !this.$maxExp){
    return false;
  }

  let exp = this.$exp + v;

  if(exp >= this.$maxExp){

    this.$exp = parseInt(exp % this.$maxExp);

    this.$level += parseInt(exp / this.$maxExp);

    this.$maxExp = ExpTable[this.$level - 1] || 0;

    for(var key in this.$attrGrow){

      this[key] += this.$attrGrow[key];

    }

    this.updateAttribute();

  }else{

    this.$exp = exp;

  }

  return true;

}

function getList(key, opt, isIndex){
  let list = this[key];

  if(!list){
    return false;
  }

  let condition;

  if(typeof opt === 'number'){
    condition = i => i.id === opt;
  }

  if(typeof opt === 'object'){
    condition = i => i.id === opt.id;
  }

  if(typeof opt === 'function'){
    condition = opt;
  }

  if(!condition){
    return false;
  }

  return isIndex ? list.findIndex(condition) : list.find(condition);
}

function removeList(key, opt) {
  let index,
      list = this[key];

  if(typeof opt === 'object'){
    index = list.findIndex(i => i.id === opt.id);
  }else{
    index = opt;
  }

  if(!~index || !list){
    return false;
  }

  if(key === '$status'){
    list[index].stateEventTimer && clearInterval(list[index].stateEventTimer);
  }

  let remove = list.splice(index,1);

  this.updateAttribute();

  return remove;
}

function changeState(changeList) {

  if(!changeList || !changeList.length){
    return ;
  }

  changeList.forEach(item => {
    let id = item.id;
    let state = this.getList('$status', {id});
    switch (item.state){
      case 'ADD':

        if(state){
          break;
        }

        state = Object.assign( PGET(id), item.action || {} );

        state.stateEvent && state.stateEvent(this);

        this.$status.push(state);

        break;
      case 'REMOVE':

        this.removeList('$status', {id});

        break;
      case 'CHANGE':

        if(state){

          state = Object.assign( state, item.action );

        }

        break;
    }
  })

  this.updateAttribute();

}

function reset(){

  this.$alive = true;

  this.$hp = this.$maxHp;

  this.$mp = this.$mp;

}

function dieDrop(){
  // 数据范例
  // $dropList : [
  //   // 物品ID, 数量范围, 几率
  //   [3000001, [3, 10], 1],
  //   [3000002, 5, 0.3],
  //   [3000003, 1, 0.5],
  //   ['gold',[1, 80], 1],
  //   ['exp', 1, 1]
  // ]
  let data = this.$dropList || [],
      consequence = [];

  data.forEach(item => {

    let num = GetRange(item[1]),
        odds = GetRandom(item[2]);
    
    if(!num || !odds || !item[0] || !item[1] || !item[2]){
      return ;
    }

    consequence.push([
      item[0], num
    ])

  });

  return consequence;
}

function itemSort(type){
  let list = this[type];

  if(!list || !list.length){
    return false;
  }

  list.sort(
    (a, b) => ((a.id || Infinity) - (b.id || Infinity))
  );

  store.commit('UPDATE');

  return true;
}

function getItem(data, force, type = '$package'){

  let container = force ? this[type] : _.cloneDeep(this[type]),
      surplus = [];
  
  if(!container || !data || !data.length){
    console.warn('[unit.getItem Error]:', data, force, t, this);
    return surplus;
  }

  data.forEach(i => {
    let item,
        num = i[1];

    if(typeof i[0] === 'object'){
      item = i[0];
    }else{
      item = PGET(i[0]);
    }

    switch(item){
      case "gold":
        force && (this.$resource.gold += num);
        return;
      case 'gem':
        force && (this.$resource.gem += num);
        return;
      case 'exp':
        force && (this.getExp(num));
        return;
    }

    let itemInPackage = this.getList(type, { id: item.id }),
        nextBlankPlace = container.findIndex(item => !item);

    item.pile && (item.num = num);

    // 可堆叠
    if(itemInPackage && item.pile){
      // 存在
      itemInPackage.num = (itemInPackage.num || 0) + num;
    }else{
      // 不存在
      if(~nextBlankPlace){
        // 有空位
        container[nextBlankPlace] = item;
      }else{
        // 没空位
        surplus.push(i);
      }
    }

  })

  store.commit('UPDATE');

  return surplus;
}

function equip(item, index, type = '$package'){
  //0武器 1护肩 2鞋子 3腰带 4上衣 5绑腿 6戒指 7护腕 8项链
  let container = this[type],
      $equipments = this.$equipments,
      equip = item.equip;
  
  if(!equip || !container || !$equipments){
    return false;
  }

  // 删除包裹中的装备, 如果已有装备, 卸载装备;
  container[index] = undefined;

  if($equipments[item.equipType]){
    this.demount(item.equipType, index, type);
  }

  $equipments[item.equipType] = item;

  // 更新附加状态;
  let status = equip.$status || [];

  status.forEach(id => {
    this.changeState({
      id,
      state : 'ADD',
      action : { notShow: true }
    })
  })

  this.updateAttribute();

  store.commit('UPDATE');

  return true;
}

function demount(equipType, index, type = '$package'){
  let container = this[type],
      equipItem = this.$equipments[equipType],
      $equipments = this.$equipments;

  $equipments[equipType] = 0;

  if(!equipItem){
    return ;
  }

  index = index || container.findIndex(i => !i);

  if(~index){
    container[index] = equipItem;
  }else{
    $equipments[equipType] = equipItem;
    return false;
  }

  for(let key in (equipItem.equip || {})){
    if(~['$skills', '$status'].indexOf(key)){
      equipItem.equip[key].forEach( id => this.removeList(key, {id}) );
    }
  }

  this.updateAttribute();

  store.commit('UPDATE');
  
}

function isEnoughInPackage(list, type = '$package'){
  // [
  //   [200001, 5]
  // ]
  let container = this[type];

  if(!container || !list || !list.length ){
    return false;
  }

  for(let opt of list){
    let item;

    item = this.getList(type, opt[0]);
    
    if(!item || (item.num || 1) < opt[1]){
      return false;
    }

  }

  return true;

}

function use(option){
  let container = this[option.position || '$package'],
      item = container[option.index];

  // 暂时不支持战斗时更换装备,所以只判断消耗品;
  if(!item || !item.use){
    return false;
  }

  let use = item.use;

  if(typeof item.use === 'function'){
    use = use.call(this);
  }

  if(use.defaultTime){
    if(!item.hasOwnProperty('coolTime')){
      Vue.set(item,'defaultTime', use.defaultTime);
      Vue.set(item,'coolTime', 0);
      Vue.set(item,'currentCoolTime', use.defaultTime);
    }
  }else{
    Vue.set(item,'coolTime', 0);
  }

  if(item.coolTime > 0){
    console.log('冷却中');
    return false;
  }

  if(use.restrict){
    for(let i = 0;i<use.restrict.length; i++){
      if(!use.restrict[i].call(this)){
        console.log('条件未满足!');
        return false;
      }
    }
  }

  if(item.num){
    item.num --;
    for(let i = 0;i<use.effect.length; i++){
      use.effect[i].call(this);
    }
    if(item.num < 1){
      container[option.index] = undefined;
    }else{
      coolTimeEvent.call(item);
    }
  }else{
    console.log('物品数量不足!');
  }

}

export default Unit;