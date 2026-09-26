import unittest

from calc import CalcError, calculate


class CalculateTest(unittest.TestCase):
    def test_basic_operations(self):
        self.assertEqual(calculate("2 + 3"), 5)
        self.assertEqual(calculate("10 - 4"), 6)
        self.assertEqual(calculate("6 * 7"), 42)
        self.assertEqual(calculate("7 / 2"), 3.5)

    def test_precedence_and_parentheses(self):
        self.assertEqual(calculate("2 + 2 * 3"), 8)
        self.assertEqual(calculate("(2 + 2) * 3"), 12)

    def test_power_and_unary(self):
        self.assertEqual(calculate("2 ^ 10"), 1024)
        self.assertEqual(calculate("-5 + 3"), -2)

    def test_decimal_comma(self):
        self.assertEqual(calculate("1,5 * 2"), 3)

    def test_errors(self):
        for expr in ("1 / 0", "2 +", "__import__('os')", "abc"):
            with self.assertRaises(CalcError):
                calculate(expr)


if __name__ == "__main__":
    unittest.main()
