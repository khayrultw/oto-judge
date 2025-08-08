import React from "react";

export default function GuidelinePage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">
        Code Submission Guidelines
      </h1>

      <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
        <li>Your code <span className="font-semibold">must</span> include a <code className="bg-gray-200 px-1 rounded">main()</code> function (for Kotlin) or equivalent entry point.</li>
        <li>You must <span className="font-semibold">read input from the console</span> using the correct method for your language.</li>
        <li>Your program output must match the expected output <span className="font-semibold">exactly</span> (no extra spaces or lines).</li>
      </ul>

      <h2 className="text-xl font-semibold mb-2 text-gray-800">Kotlin Example:</h2>
      <pre className="bg-gray-900 text-green-300 p-4 rounded-lg overflow-x-auto text-sm mb-6">
{`fun main() {
    var inp = readln().trim().lowercase()
    println(inp)
}`}
      </pre>

      <h2 className="text-xl font-semibold mb-2 text-gray-800">JavaScript Example:</h2>
      <pre className="bg-gray-900 text-green-300 p-4 rounded-lg overflow-x-auto text-sm mb-6">
{`var ch = readline();
var upper = ch.toUpperCase();
print(upper);`}
      </pre>

      <h2 className="text-xl font-semibold mb-2 text-gray-800">Python Example:</h2>
      <pre className="bg-gray-900 text-green-300 p-4 rounded-lg overflow-x-auto text-sm">
{`value = int(input())
print(value * 2)`}
      </pre>

      <p className="mt-6 text-gray-700">
        <span className="font-semibold">Note:</span> Submissions without proper input reading or exact output format may fail the tests.
      </p>
    </div>
  );
}
