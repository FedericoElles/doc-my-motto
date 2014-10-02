var acorn = require("acorn");
var fs = require("fs");
var path = require('path');
var walker = require('acorn/util/walk')




function createDoc(source){

  var comments = {}; //map all comments

  var tree = acorn.parse(source, {locations:true, onComment:function(block, text, start, end, location){
    console.log('Comment:', location.line +': '+ text);
    comments[location.line] = text;
  }});

  //console.log('source', source.toString());

  //console.log('tree', tree);

  var module = [];

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
    },
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
      }
      //is special type?
      ['factory','directive','filter','service','provider'].forEach(function(type){
        if (func.name.toLowerCase().indexOf(type)>-1) {
          func.type = type;
          func.level = 0;
        }
      });

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
  var eParent;
  module.forEach(function(element){
    if (element.level === 0){
      element.internal = {
        funcs: {},
        vars: {}
      };
      element.api = {
        funcs: {},
        vars: {}      
      };
      eParent = element;
      doc.children.push(element);
    } else { //children
      if (eParent){
        //determine target for element
        if (element.public){
          if (element.type === 'function'){
            eParent.api.funcs[element.name] = element;
          } else {
            eParent.api.vars[element.name] = element;
          }
        } else {
          if (element.type === 'function'){
            eParent.internal.funcs[element.name] = element;
          } else {
            eParent.internal.vars[element.name] = element;
          } 
        }
      }
    }
  });

  //console.log('doc', doc);
  console.log('module', module);
  return doc;
}

//test
//var source = fs.readFileSync(path.resolve(process.cwd(),'angular-uam.js'));
//var doc = createDoc(source);
//fs.writeFileSync(path.resolve(process.cwd(), 'angular-uam.doc.json'), JSON.stringify(doc));


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

processDir('input');
fs.writeFileSync(path.resolve(process.cwd(), 'output','docs.json'), JSON.stringify(modules));
