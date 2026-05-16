import React from "react";

export default function GuidelinePage() {
  return (
    <div className="p-5 max-w-3xl mx-auto text-sm">
      <h1 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
        Code Submission Guidelines
      </h1>

      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-4 space-y-1">
        <li>Your code <span className="font-semibold">must</span> include a <code className="bg-gray-200 dark:bg-gray-700 px-0.5 rounded text-gray-900 dark:text-white">main()</code> function (for Kotlin and dart) or equivalent entry point.</li>
        <li>You must <span className="font-semibold">read input from the console</span> using the correct method for your language.</li>
        <li>Your program output must match the expected output <span className="font-semibold">exactly</span> (no extra spaces or lines).</li>
      </ul>

      <h2 className="text-base font-semibold mb-2 text-gray-800 dark:text-white">Kotlin Example:</h2>
      <pre className="bg-gray-900 dark:bg-gray-950 text-green-300 dark:text-green-400 p-4 rounded overflow-x-auto text-sm mb-4">
{`fun main() {
    var inp = readln().trim().lowercase()
    println(inp)

    // Read multiple integers
    val numbers = readln().split(" ").map { it.toInt() }

    // Read single integer
    val num = readln().trim().toInt()

    // Read double number
    val d = readln().trim().toDouble()

    // Read array of doubles
    val arr = readln().split(" ").map { it.toDouble() }

}`}
      </pre>

      <h2 className="text-base font-semibold mb-2 text-gray-800 dark:text-white">JavaScript Example:</h2>
      <pre className="bg-gray-900 dark:bg-gray-950 text-green-300 dark:text-green-400 p-4 rounded overflow-x-auto text-sm mb-4">
{`var ch = readline();
var upper = ch.toUpperCase();
print(upper);

// Read multiple integers
var numbers = readline().split(" ").map(function(x) { return parseInt(x); });

// Read Single integer
var num = parseInt(readline().trim());

// Read double number
var d = parseFloat(readline().trim());

// Read array of doubles
var arr = readline().split(" ").map(function(x) { return parseFloat(x); });`}
      </pre>

      <h2 className="text-base font-semibold mb-2 text-gray-800 dark:text-white">Python Example:</h2>
      <pre className="bg-gray-900 dark:bg-gray-950 text-green-300 dark:text-green-400 p-4 rounded overflow-x-auto text-sm mb-4">
{`value = int(input())
print(value * 2)

# Read multiple integers
numbers = list(map(int, input().split()))

# Read single integer
num = int(input().strip())

# Read double number
d = float(input().strip())

# Read array of doubles
arr = list(map(float, input().split()))`}
      </pre>

  <h2 className="text-base font-semibold mb-2 text-gray-800 dark:text-white">Dart Example:</h2>
  <pre className="bg-gray-900 dark:bg-gray-950 text-green-300 dark:text-green-400 p-4 rounded overflow-x-auto text-sm mb-4">
{`import 'dart:io';

void main() {
  // Read single string (not-null assertion)
  final text = stdin.readLineSync()!;

  // Read array of strings (not-null assertion)
  final words = stdin.readLineSync()!.trim().split(' ');

  // Read multiple integers
  final numbers = stdin.readLineSync()!.trim().split(' ').map(int.parse).toList();

  // Read single integer
  final num = int.parse(stdin.readLineSync()!.trim());

  // Read double number
  final d = double.parse(stdin.readLineSync()!.trim());

  // Read array of doubles
  final arr = stdin.readLineSync()!.trim().split(' ').map(double.parse).toList();
}`}
  </pre>

      <p className="mt-4 text-gray-700 dark:text-gray-300">
        <span className="font-semibold">Note:</span> Submissions without proper input reading or exact output format may fail the tests.
      </p>
    </div>
  );
}
