#!/usr/bin/env python3
"""Простой калькулятор.

Запуск:
    python3 calc.py              # интерактивный режим
    python3 calc.py "2 + 2 * 3"  # вычислить одно выражение

Поддерживаются: + - * / // % ** и скобки.
"""

import ast
import operator
import sys

BINARY_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}

UNARY_OPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


class CalcError(Exception):
    pass


def _eval(node):
    if isinstance(node, ast.Expression):
        return _eval(node.body)
    if isinstance(node, ast.Constant) and type(node.value) in (int, float):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in BINARY_OPS:
        left, right = _eval(node.left), _eval(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > 1000:
            raise CalcError("слишком большая степень")
        return BINARY_OPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in UNARY_OPS:
        return UNARY_OPS[type(node.op)](_eval(node.operand))
    raise CalcError("недопустимое выражение")


def calculate(expression):
    """Вычисляет арифметическое выражение и возвращает число."""
    expression = expression.replace(",", ".").replace("^", "**")
    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError:
        raise CalcError("синтаксическая ошибка")
    try:
        result = _eval(tree)
    except ZeroDivisionError:
        raise CalcError("деление на ноль")
    if isinstance(result, float) and result.is_integer():
        result = int(result)
    return result


def main(argv):
    if argv:
        try:
            print(calculate(" ".join(argv)))
        except CalcError as e:
            print(f"Ошибка: {e}", file=sys.stderr)
            return 1
        return 0

    print("Калькулятор. Введите выражение или 'q' для выхода.")
    while True:
        try:
            line = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if line.lower() in ("q", "quit", "exit"):
            break
        if not line:
            continue
        try:
            print(calculate(line))
        except CalcError as e:
            print(f"Ошибка: {e}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
