package utils

import "sync"

type SSEClient chan string

type Broadcaster struct {
	mu      sync.RWMutex
	clients map[string][]SSEClient
}

func newBroadcaster() *Broadcaster {
	return &Broadcaster{clients: make(map[string][]SSEClient)}
}

func (b *Broadcaster) Subscribe(topic string) SSEClient {
	ch := make(SSEClient)
	b.mu.Lock()
	b.clients[topic] = append(b.clients[topic], ch)
	b.mu.Unlock()
	return ch
}

func (b *Broadcaster) Publish(topic string, msg string) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for _, ch := range b.clients[topic] {
		select {
		case ch <- msg:
		default:
		}
	}
}

var (
	once     sync.Once
	instance *Broadcaster
)

func GetBroadcaster() *Broadcaster {
	once.Do(func() {
		instance = newBroadcaster()
	})
	return instance
}
