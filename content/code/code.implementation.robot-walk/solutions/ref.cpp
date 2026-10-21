#include <iostream>
#include <string>

using namespace std;

// Direction deltas: 0: North, 1: East, 2: South, 3: West
const int dx[4] = {0, 1, 0, -1};
const int dy[4] = {1, 0, -1, 0};

void solve() {
    string s;
    if (!(cin >> s)) return;

    int x = 0, y = 0;
    int dir = 0; // facing North

    for (char c : s) {
        if (c == 'F') {
            x += dx[dir];
            y += dy[dir];
        } else if (c == 'R') {
            dir = (dir + 1) % 4;
        } else if (c == 'L') {
            dir = (dir + 3) % 4;
        }
    }

    cout << x << " " << y << "\n";
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int t;
    if (cin >> t) {
        while (t--) {
            solve();
        }
    }
    return 0;
}
