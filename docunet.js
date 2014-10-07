var acorn = require("acorn");
var fs = require("fs");
var path = require('path');
var walker = require('acorn/util/walk')




function createDoc(source){

  var comments = {}; //map all comments

  function ltrim(s, char)
  {
    var l=0;
    while(l < s.length && s[l] == char)
    { l++; }
    return s.substring(l, s.length);
  }


  var tree = acorn.parse(source, {locations:true, onComment:function(block, text, start, end, location){
    var len = text.length - text.replace(/\n/g,'').length;
    var parts = text.replace(/\r/g,'').split('\n');
    var newText = [];
    for (var i = 0, ii = parts.length;i<ii;i+=1){
      parts[i] = ltrim(ltrim(ltrim(parts[i],' '),'*'),' ');
      if (parts[i].length>0){
        newText.push(parts[i]);
      }
    }
    var text2 = newText.join('\n');
    console.log('Comment:', (location.line+len) +':\n'+ text2);
    comments[location.line+len] = newText;
  }});

  //console.log('source', source.toString());

  //console.log('tree', tree);

  var module = [];
  var reg = {};
  var regFunc = {};

  walker.simple(tree, {
    CallExpression: function(n, st, c){
      //find module name
      if (n.callee && n.arguments){
        if (n.callee.object && n.callee.property){
          if (n.callee.object.name === 'angular' && 
              n.callee.property.name === 'module'){
            if (n.arguments.length === 2){
              if (n.arguments[0].value){
                module.name = n.arguments[0].value;
              }
            }
          }
        }
      }
      //find registration of parameters
      if (n.callee && n.arguments){
        if (n.callee.property && n.arguments.length === 2){
          if (['factory','directive','filter','service','provider']
                .indexOf(n.callee.property.name) > -1){
            console.log('REG: ' + n.callee.property.name + ' - ');
            reg[n.arguments[1].name] = {
              type: n.callee.property.name,
              publicName:  n.arguments[0].value,
              funcName: n.arguments[1].name
            };
            regFunc[n.arguments[1].name] = n.arguments[0].value;
          }
        }
      }
    }
  });

  console.log('reg', reg);

  walker.simple(tree, {    
    ExpressionStatement: function(n, st, c){
      //search for public functions
      var func = {
        name:'',
        type: 'function',
        parentObject :'',
        public: true,
        line: -1,
        params:[]
      };
      if (n.expression){
        if (n.expression.type === 'AssignmentExpression' &&
            n.expression.left &&
            n.expression.right.type === 'FunctionExpression'){
          if (n.expression.left.object){
            func.parentObject = n.expression.left.object.name;
            func.line = n.expression.left.object.loc.start.line;
          }
          if (n.expression.left.property){
            func.name = n.expression.left.property.name;
          }

          if (func.name[0] === func.name[0].toUpperCase()){
            func.type = 'class';
            func.api = {
              funcs: [],
              vars: []
            };   
          }

          if (n.expression.right.params){ //parameters
            n.expression.right.params.forEach(function(param){
              func.params.push({
                name: param.name
              });
            });
          }        
        }
      }
      if (func.name && func.line){
        //console.log('public.func', func);
        module.push(func);
      }
      //console.log('ExpressionStatement', n);
    },
    FunctionDeclaration: function(n, st, c){
      //console.log('FunctionDeclaration', n);
      var func = {
        name:'',
        type: 'function',
        level: -1,
        line: -1,
        params:[]
      };
      if (n.id){ //id and line
        func.name = n.id.name;
        func.line = n.id.loc.start.line;
      }
      //is class?
      if (func.name[0] === func.name[0].toUpperCase()){
        func.type = 'class';
        func.api = {
          funcs: [],
          vars: []
        };     
      }
      //is special type?
      /*
      ['factory','directive','filter','service','provider'].forEach(function(type){
        if (func.name.toLowerCase().indexOf(type)>-1) {
          func.type = type;
          func.level = 0;
        }
      });
      */
      if (reg[func.name]){
        //var registeredName = regFunc[func.name];
        //console.log('registeredName', func.name, reg[func.name]);
        func.type = reg[func.name].type
        func.publicName = reg[func.name].publicName;
        func.level = 0;
      }

      if (n.params){ //parameters
        n.params.forEach(function(param){
          func.params.push({
            name: param.name
          });
        });
      }
      
      module.push(func);
    }

  });


  //sort modules by line
  module.sort(function(a,b){
    return a.line - b.line;
  });

  //build document containing documentation
  var doc = {
    name:module.name,
    children:[]
  }

  //convert module to tree
  var eParent,
      classParent,
      commentParts;
  module.forEach(function(element){
    //comments
    if (element.line > 0){
      if (comments[element.line-1]){
        element.comments = comments[element.line-1];
      }
    }

    //try to match comments against params
    if (element.comments && element.params){
      element.params.forEach(function(param){
        element.comments.forEach(function(comment){
          commentParts = comment.split(' ');
          if (commentParts[0] === param.name &&
              commentParts.length > 1){
            param.type = commentParts[1];
            param.desc = commentParts.splice(2).join(' ');
            comment = '';
          }
        })
      });
    }


    if (element.level === 0){
      element.internal = {
        funcs: [],
        vars: []
      };
      element.api = {
        funcs: [],
        vars: []      
      };
      eParent = element;
      doc.children.push(element);
      classParent = false;
    } else { //children
      if (eParent){
        if (element.type === 'class'){
          classParent = element;
        }

        //determine target for element
        if (element.public){
          if (!element.parentObject && classParent){ //no parent object, belongs to Class
            if (element.type === 'function'){
              classParent.api.funcs.push(element);
            } else {
              classParent.api.vars.push(element);
            }
          } else { //parent object: belongs to module
            if (element.type === 'function'){
              eParent.api.funcs.push(element);
            } else {
              eParent.api.vars.push(element);
            }
          }
        } else {
          if (element.type === 'function'){
            eParent.internal.funcs.push(element);
          } else {
            eParent.internal.vars.push(element);
          } 
        }
      }
    }
  });

  //console.log('doc', doc);
  console.log('module', module);
  //console.log('reg', reg);
  //console.log('regFunc', regFunc);
  return doc;
}


var test = true;
//test
if (test){
  var file = 'angular-defer.js'
  var source = fs.readFileSync(path.resolve(process.cwd(),'input', file));
  var doc = createDoc(source);
  fs.writeFileSync(path.resolve(process.cwd(), file.replace('js','json')), JSON.stringify(doc, null, 4));
}

var modules = [];

function processDir(uri){
  console.log('path', path.resolve(process.cwd(),uri));

  var files = fs.readdirSync(path.resolve(process.cwd(),uri));
  files.forEach(function(file){
    var src;
    if (file.slice(-2) === 'js'){
      console.log('file', file);
      src = fs.readFileSync(path.resolve(process.cwd(),uri,file));
      modules.push(createDoc(src));
    }
  });
}

if (!test){
  processDir('input');
  fs.writeFileSync(path.resolve(process.cwd(), 'output','docs.json'), JSON.stringify(modules, null, 4));
}
