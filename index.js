var OPCODE_TO_OP = {
  0000: 'ERROR',
  0001: 'NOOP',
  0002: 'RSET',
  0003: 'RCPY',
  0004: 'RADD',
  0005: 'MSET',
  0006: 'MGET',
  0007: 'JILT'
};
var NUM_TO_REGISTER = {
  0: 'IP',
  1: 'R1',
  2: 'R2',
  3: 'R3'
};

var OP_TO_OPCODE =  _.invert(OPCODE_TO_OP);
var REGISTER_TO_NUM =  _.invert(NUM_TO_REGISTER);


function init() {
  $('#program form').trigger('reset');
}

function render_line_numbers() {
  var offset = parseInt($('#program .load_at').val()) || 0;
  var num_lines = Math.max(($('#program textarea').val() + "...").split(/\n/).length, 1);
  var str = "";
  for (var i = 0; i < num_lines; i++) {
    str += i+offset + "<br/>";
  }
  $('#program .line_numbers').html(str);
}

var default_cpu = {
  IP: 0,
  R1: 0,
  R2: 0,
  R3: 0
};
var default_memory = [];

var interpreter = function(cpu, memory) {
  var instructions = {
    NOOP: function() {},
    RSET: function(register, value) {
      cpu[NUM_TO_REGISTER[register]] = value;
    },
    RCPY: function(register_src, register_dest) {
      cpu[NUM_TO_REGISTER[register_dest]] = cpu[NUM_TO_REGISTER[register_src]];
    },
    RADD: function(register_accum, register_addend) {
      cpu[NUM_TO_REGISTER[register_accum]] += cpu[NUM_TO_REGISTER[register_addend]];
    },
    MSET: function(mem_dest, register) {
      memory[mem_dest] = cpu[NUM_TO_REGISTER[register]];
    },
    MGET: function(mem_src, register) {
      cpu[NUM_TO_REGISTER[register]] = memory[mem_src];
    },
    JILT: function(register, compare, program_pos) {
      var value = cpu[NUM_TO_REGISTER[register]];
      if (value < compare) {
        cpu.IP = program_pos;
      }
    }
  }

  function log_error(msg) {
    alert(msg);
  }

  return {
    execute: function() {
      var instruction = memory[cpu.IP++];
      if (_.isUndefined(instruction)) {
        return false;
      }
      var op = OPCODE_TO_OP[instruction];
      var method = instructions[op];
      if (!method) {
        log_error("Unknown instruction: " + op);
        return false;
      }

      var numargs = method.length;
      var args = [];
      for (var i = 0; i < numargs; i++) {
        args.push(memory[cpu.IP++]);
      }

      if (_.find(args, _.isUndefined)) {
        log_error("Bad number of arguments to " + op + ". Expected " + method.length + ", got " + args.length);
        return false;
      }

      method.apply(this, args);
      return true;
    }
  };
}

function clear_cpu_log() {
  $('.cpu TBODY TR:not(.template)').remove();
}
function log_cpu(cpu) {
  var tmpl = $('.cpu TR.template').clone().removeClass('template');
  _.each(_.keys(cpu), function (key) {
    tmpl.find("." + key).text(cpu[key]);
  });
  $('.cpu tbody').append(tmpl);
}

function dump_memory(memory) {
  $('.heap TBODY TR:not(.template)').remove();
  var tmpl = $('.heap TR.template');
  var body = $('.heap TBODY');
  _.each(_.keys(memory), function(idx) {
    idx = parseInt(idx);
    var row = tmpl.clone().removeClass('template');
    row.find('.pos').html(idx);
    row.find('.value').html(memory[idx]);
    row.find('.operation').html(
      OPCODE_TO_OP[ memory[idx] ] || ""
    );
    body.append(row);
  });
}

function parse(program) {
  var lines = _.reject(program.split(/\n/), _.isEmpty);
  return _.flatten(_.map(lines, function(line) {
    var parts = line.split(/,? /);
    var op = OP_TO_OPCODE[parts[0]]
    if (_.isUndefined(op)) {
      log_error("Cannot parse instruction " + parts[0]);
      op = OP_TO_OPCODE['ERROR'];
    }
    var args = _.map(_.rest(parts), function(arg) {
      if (_.has(REGISTER_TO_NUM, arg)) {
        return REGISTER_TO_NUM[arg];
      } else {
        return parseInt(arg);
      }
    });

    return [ op ].concat(args);
  }));
}

var memory = [];
var cpu = {};

function load_program() {
  clear_cpu_log();
  cpu = _.clone(default_cpu);
  memory = _.clone(default_memory);
  var program = parse($('#program textarea').val());
  var offset = parseInt($('#program .load_at').val()) || 0;
  cpu.IP = offset;
  _.each(_.keys(program), function(idx) {
    idx = parseInt(idx);
    memory[idx + offset] = program[idx];
  });
  dump_memory(memory);
}

function run_program() {
  load_program(); // TODO: rm
  var i = interpreter(cpu, memory);
  var MAX_TICKS = 10000;
  var ticks_run = 0;
  while (i.execute() && ticks_run <= MAX_TICKS) {
    log_cpu(cpu);
    dump_memory(memory);
    ticks_run++;
  }
}

$(document).on('ready', function() {
  init();
  $('#program textarea').on('change keyup', function(evt) {
    if (evt.type == "change" || evt.which == 13 || evt.which == 8) { render_line_numbers(evt); }
  }).trigger('change');
  $('#program .load_at').on('change keyup', render_line_numbers);
  $('#program textarea').on('keypress', function(evt) {
    if (evt.which == 13 && (evt.metaKey || evt.ctrlKey)) { load_program(); }
  }).trigger('change');
  $('#program input[type=submit]').on('click', function() { load_program(); return false; });
  $('#run_button').on('click', run_program);
});
